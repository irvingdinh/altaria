import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { IDisposable } from 'node-pty';
import WebSocket from 'ws';

import { PtyService, type PtySession } from '../services/pty.service';

interface AttachMessage {
  type: 'attach';
  sessionId: string;
}

interface InputMessage {
  type: 'input';
  data: string;
}

interface ResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

type ClientMessage = AttachMessage | InputMessage | ResizeMessage;

interface ClientState {
  session: PtySession;
  dataDisposer: IDisposable;
}

@WebSocketGateway({ path: '/ws/terminal' })
export class TerminalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private clients = new Map<WebSocket, ClientState>();

  constructor(private readonly ptyService: PtyService) {}

  handleConnection(client: WebSocket): void {
    client.on('message', (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(
          typeof raw === 'string' ? raw : raw.toString(),
        ) as ClientMessage;

        switch (msg.type) {
          case 'attach':
            this.handleAttach(client, msg.sessionId);
            break;
          case 'input':
            this.handleInput(client, msg.data);
            break;
          case 'resize':
            this.handleResize(client, msg.cols, msg.rows);
            break;
          default:
            this.sendError(client, 'Invalid message format');
        }
      } catch {
        this.sendError(client, 'Invalid message format');
      }
    });
  }

  handleDisconnect(client: WebSocket): void {
    const state = this.clients.get(client);
    if (state) {
      state.dataDisposer.dispose();
      this.clients.delete(client);
    }
  }

  @OnEvent('session.exited')
  handleSessionExited({
    sessionId,
    exitCode,
  }: {
    sessionId: string;
    exitCode: number;
  }): void {
    for (const [client, state] of this.clients.entries()) {
      if (state.session.id === sessionId) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'exit', code: exitCode }));
        }
        state.dataDisposer.dispose();
        this.clients.delete(client);
      }
    }
  }

  private handleAttach(client: WebSocket, sessionId: string): void {
    // Detach from previous session if any
    const existing = this.clients.get(client);
    if (existing) {
      existing.dataDisposer.dispose();
      this.clients.delete(client);
    }

    const session = this.ptyService.findById(sessionId);
    if (!session) {
      this.sendError(client, 'Session not found');
      return;
    }

    // Replay buffered output
    const buffer = this.ptyService.getBufferedOutput(session);
    if (buffer) {
      client.send(JSON.stringify({ type: 'output', data: buffer }));
    }

    // Subscribe to new output
    const dataDisposer = session.pty.onData((data) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'output', data }));
      }
    });

    this.clients.set(client, { session, dataDisposer });
  }

  private handleInput(client: WebSocket, data: string): void {
    const state = this.clients.get(client);
    if (!state) return;
    this.ptyService.write(state.session, data);
  }

  private handleResize(client: WebSocket, cols: number, rows: number): void {
    if (
      !Number.isFinite(cols) ||
      !Number.isFinite(rows) ||
      cols <= 0 ||
      rows <= 0
    )
      return;
    const state = this.clients.get(client);
    if (!state) return;
    this.ptyService.resize(state.session, cols, rows);
  }

  private sendError(client: WebSocket, message: string): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'error', message }));
    }
  }
}
