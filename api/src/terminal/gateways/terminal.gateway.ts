import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { IDisposable } from 'node-pty';
import WebSocket from 'ws';

import { PtyService } from '../services/pty.service';

interface AttachMessage {
  type: 'attach';
  sessionId: string;
  cols?: number;
  rows?: number;
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

interface PingMessage {
  type: 'ping';
}

type ClientMessage = AttachMessage | InputMessage | ResizeMessage | PingMessage;

interface ClientState {
  sessionId: string;
  attachmentId: string;
  dataDisposer: IDisposable;
}

@WebSocketGateway({ path: '/ws/terminal' })
export class TerminalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private clients = new Map<WebSocket, ClientState>();
  private heartbeats = new Map<
    WebSocket,
    { interval: NodeJS.Timeout; isAlive: boolean }
  >();

  constructor(private readonly ptyService: PtyService) {}

  handleConnection(client: WebSocket): void {
    // Protocol-level heartbeat: ping every 30s, terminate if no pong
    const hb = {
      isAlive: true,
      interval: <NodeJS.Timeout>(<unknown>undefined),
    };
    hb.interval = setInterval(() => {
      if (!hb.isAlive) {
        client.terminate();
        return;
      }
      hb.isAlive = false;
      client.ping();
    }, 30_000);
    client.on('pong', () => {
      hb.isAlive = true;
    });
    this.heartbeats.set(client, hb);

    client.on('message', (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(
          typeof raw === 'string' ? raw : raw.toString(),
        ) as ClientMessage;

        switch (msg.type) {
          case 'attach':
            void this.handleAttach(client, msg.sessionId, msg.cols, msg.rows);
            break;
          case 'input':
            this.handleInput(client, msg.data);
            break;
          case 'resize':
            this.handleResize(client, msg.cols, msg.rows);
            break;
          case 'ping':
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'pong' }));
            }
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
    const hb = this.heartbeats.get(client);
    if (hb) {
      clearInterval(hb.interval);
      this.heartbeats.delete(client);
    }

    const state = this.clients.get(client);
    if (state) {
      state.dataDisposer.dispose();
      this.ptyService.detach(state.attachmentId);
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
      if (state.sessionId === sessionId) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'exit', code: exitCode }));
        }
        state.dataDisposer.dispose();
        this.clients.delete(client);
      }
    }
  }

  private async handleAttach(
    client: WebSocket,
    sessionId: string,
    cols?: number,
    rows?: number,
  ): Promise<void> {
    // Detach from previous session if any
    const existing = this.clients.get(client);
    if (existing) {
      existing.dataDisposer.dispose();
      this.ptyService.detach(existing.attachmentId);
      this.clients.delete(client);
    }

    try {
      const {
        attachmentId,
        pty: attachPty,
        scrollback,
      } = await this.ptyService.attach(sessionId, cols ?? 80, rows ?? 24);

      // Replay scrollback
      if (scrollback) {
        client.send(JSON.stringify({ type: 'output', data: scrollback }));
      }

      // Subscribe to new output
      const dataDisposer = attachPty.onData((data) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'output', data }));
        }
      });

      this.clients.set(client, { sessionId, attachmentId, dataDisposer });
    } catch {
      this.sendError(client, 'Session not found');
    }
  }

  private handleInput(client: WebSocket, data: string): void {
    const state = this.clients.get(client);
    if (!state) return;
    this.ptyService.write(state.attachmentId, data);
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
    this.ptyService.resize(state.attachmentId, cols, rows);
  }

  private sendError(client: WebSocket, message: string): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'error', message }));
    }
  }
}
