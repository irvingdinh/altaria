import type { ServerWebSocket } from 'bun';

import { PtyProcess } from './pty-process.ts';
import type { WsData } from './routes/show.route.ts';

const MAX_SCROLLBACK_BYTES = 256 * 1024; // 256KB

interface Session {
  terminalId: string;
  pty: PtyProcess;
  clients: Set<ServerWebSocket<WsData>>;
  scrollback: Uint8Array[];
  scrollbackBytes: number;
}

class SessionManager {
  private sessions = new Map<string, Session>();

  getOrCreate(terminalId: string): Session {
    let session = this.sessions.get(terminalId);
    if (session) return session;

    const pty = PtyProcess.spawn(24, 80);

    session = {
      terminalId,
      pty,
      clients: new Set(),
      scrollback: [],
      scrollbackBytes: 0,
    };

    pty.startReading(
      (data) => this.onPtyData(terminalId, data),
      (exitCode) => this.onPtyExit(terminalId, exitCode),
    );

    this.sessions.set(terminalId, session);
    return session;
  }

  attach(terminalId: string, ws: ServerWebSocket<WsData>): void {
    const session = this.getOrCreate(terminalId);

    // Replay scrollback
    for (const chunk of session.scrollback) {
      ws.sendBinary(chunk);
    }

    session.clients.add(ws);
  }

  detach(ws: ServerWebSocket<WsData>): void {
    const { terminalId } = ws.data;
    const session = this.sessions.get(terminalId);
    if (!session) return;
    session.clients.delete(ws);
  }

  write(terminalId: string, data: Uint8Array): void {
    const session = this.sessions.get(terminalId);
    if (!session) return;
    session.pty.write(data);
  }

  resize(terminalId: string, rows: number, cols: number): void {
    const session = this.sessions.get(terminalId);
    if (!session) return;
    session.pty.resize(rows, cols);
  }

  shutdown(): void {
    for (const [id, session] of this.sessions) {
      session.pty.kill();
      for (const ws of session.clients) {
        ws.close(1001, 'Server shutting down');
      }
      this.sessions.delete(id);
    }
  }

  private onPtyData(terminalId: string, data: Uint8Array): void {
    const session = this.sessions.get(terminalId);
    if (!session) return;

    // Append to scrollback
    session.scrollback.push(data.slice());
    session.scrollbackBytes += data.length;

    // Trim scrollback if over limit
    while (session.scrollbackBytes > MAX_SCROLLBACK_BYTES) {
      const removed = session.scrollback.shift();
      if (removed) {
        session.scrollbackBytes -= removed.length;
      } else {
        break;
      }
    }

    // Broadcast to all connected clients
    for (const ws of session.clients) {
      ws.sendBinary(data);
    }
  }

  private onPtyExit(terminalId: string, exitCode: number): void {
    const session = this.sessions.get(terminalId);
    if (!session) return;

    for (const ws of session.clients) {
      ws.close(1000, `Process exited with code ${exitCode}`);
    }

    this.sessions.delete(terminalId);
  }
}

export const sessionManager = new SessionManager();
