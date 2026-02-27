import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'fs';
import { nanoid } from 'nanoid';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import { tmpdir } from 'os';
import { join } from 'path';

export interface PtySession {
  id: string;
  pty: IPty;
  cwd: string;
}

@Injectable()
export class PtyService implements OnModuleDestroy {
  private sessions = new Map<string, PtySession>();

  create(cols: number, rows: number): PtySession {
    const id = nanoid();
    const cwd = mkdtempSync(join(tmpdir(), 'altaria-'));
    const proc = pty.spawn('claude', [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    const session: PtySession = { id, pty: proc, cwd };
    this.sessions.set(id, session);

    return session;
  }

  write(session: PtySession, data: string): void {
    session.pty.write(data);
  }

  resize(session: PtySession, cols: number, rows: number): void {
    session.pty.resize(cols, rows);
  }

  destroy(session: PtySession): void {
    session.pty.kill();
    this.sessions.delete(session.id);
    rmSync(session.cwd, { recursive: true, force: true });
  }

  onModuleDestroy(): void {
    for (const session of this.sessions.values()) {
      session.pty.kill();
      rmSync(session.cwd, { recursive: true, force: true });
    }
    this.sessions.clear();
  }
}
