import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import WebSocket from 'ws';

import { FlowControlConstants } from '../pty-host/pty-host.protocol';
import { PtyHostService } from '../services/pty-host.service';

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

interface AckMessage {
  type: 'ack';
  charCount: number;
}

type ClientMessage =
  | AttachMessage
  | InputMessage
  | ResizeMessage
  | PingMessage
  | AckMessage;

interface ClientState {
  sessionId: string;
  dataDisposer: () => void;
  unsentAckCount: number;
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

  constructor(private readonly ptyHostService: PtyHostService) {}

  handleConnection(client: WebSocket): void {
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
          case 'ack':
            this.handleAck(client, msg.charCount);
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
      state.dataDisposer();
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
        state.dataDisposer();
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
    const existing = this.clients.get(client);
    if (existing) {
      existing.dataDisposer();
      this.clients.delete(client);
    }

    try {
      const session = await this.ptyHostService.findById(sessionId);
      if (!session) {
        this.sendError(client, 'Session not found');
        return;
      }

      if (session.detached && session.serializedBuffer) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: 'replay',
              data: session.serializedBuffer,
            }),
          );
        }
        await this.ptyHostService.reattach(sessionId);
      }

      if (!this.ptyHostService.isSessionActive(sessionId)) {
        this.sendError(client, 'Session not active');
        return;
      }

      const { onData } = this.ptyHostService.attach(sessionId);

      if (cols && rows) {
        this.ptyHostService.resize(sessionId, cols, rows);
      }

      const dataDisposer = onData((data) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'output', data }));
        }
      });

      this.clients.set(client, {
        sessionId,
        dataDisposer,
        unsentAckCount: 0,
      });
    } catch {
      this.sendError(client, 'Session not found');
    }
  }

  private handleInput(client: WebSocket, data: string): void {
    const state = this.clients.get(client);
    if (!state) return;
    this.ptyHostService.write(state.sessionId, data);
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
    this.ptyHostService.resize(state.sessionId, cols, rows);
  }

  private handleAck(client: WebSocket, charCount: number): void {
    const state = this.clients.get(client);
    if (!state) return;

    state.unsentAckCount += charCount;

    while (state.unsentAckCount >= FlowControlConstants.CharCountAckSize) {
      state.unsentAckCount -= FlowControlConstants.CharCountAckSize;
      this.ptyHostService.acknowledgeData(
        state.sessionId,
        FlowControlConstants.CharCountAckSize,
      );
    }
  }

  private sendError(client: WebSocket, message: string): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'error', message }));
    }
  }
}
