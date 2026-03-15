import type { ServerWebSocket } from 'bun';

import type { WsData } from '../core/types.ts';
import { PtyProcess } from './pty-process.ts';

const MAX_SCROLLBACK_BYTES = 256 * 1024; // 256KB

interface Session {
  terminalId: string;
  cwd?: string;
  pty: PtyProcess;
  clients: Set<ServerWebSocket<WsData>>;
  scrollback: Uint8Array[];
  scrollbackBytes: number;
  createdAt: number;
}

class SessionManager {
  private sessions = new Map<string, Session>();

  getOrCreate(terminalId: string, cwd?: string): Session {
    let session = this.sessions.get(terminalId);
    if (session) return session;

    const pty = PtyProcess.spawn(24, 80, cwd);

    session = {
      terminalId,
      cwd,
      pty,
      clients: new Set(),
      scrollback: [],
      scrollbackBytes: 0,
      createdAt: Date.now(),
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

    if (session.clients.size === 0 && !session.pty.isAlive) {
      this.sessions.delete(terminalId);
    }
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

  list(): Array<{
    id: string;
    cwd?: string;
    createdAt: number;
    clientCount: number;
  }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.terminalId,
      cwd: s.cwd,
      createdAt: s.createdAt,
      clientCount: s.clients.size,
    }));
  }

  destroy(terminalId: string): boolean {
    const session = this.sessions.get(terminalId);
    if (!session) return false;

    session.pty.kill();
    for (const ws of session.clients) {
      ws.close(1000, 'Session destroyed');
    }
    this.sessions.delete(terminalId);
    return true;
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

    const exitMsg = new Uint8Array([0x02, exitCode & 0xff]);
    for (const ws of session.clients) {
      ws.sendBinary(exitMsg);
    }
  }
}

export const sessionManager = new SessionManager();
