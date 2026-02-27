import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import WebSocket from 'ws';

import { PtyService, type PtySession } from '../services/pty.service';

interface InputMessage {
  type: 'input';
  data: string;
}

interface ResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

type ClientMessage = InputMessage | ResizeMessage;

@WebSocketGateway({ path: '/ws/terminal' })
export class TerminalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private clients = new Map<WebSocket, PtySession>();

  constructor(private readonly ptyService: PtyService) {}

  handleConnection(client: WebSocket): void {
    const session = this.ptyService.create(80, 24);
    this.clients.set(client, session);

    session.pty.onData((data) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'output', data }));
      }
    });

    session.pty.onExit(({ exitCode }) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'exit', code: exitCode }));
      }
    });

    client.on('message', (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(
          typeof raw === 'string' ? raw : raw.toString(),
        ) as ClientMessage;

        switch (msg.type) {
          case 'input':
            this.ptyService.write(session, msg.data);
            break;
          case 'resize':
            this.ptyService.resize(session, msg.cols, msg.rows);
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
    const session = this.clients.get(client);
    if (session) {
      this.ptyService.destroy(session);
      this.clients.delete(client);
    }
  }

  private sendError(client: WebSocket, message: string): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'error', message }));
    }
  }
}
