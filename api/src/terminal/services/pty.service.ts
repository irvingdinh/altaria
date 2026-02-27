import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { nanoid } from 'nanoid';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';

const OUTPUT_BUFFER_MAX = 50 * 1024; // 50 KB

export interface PtySession {
  id: string;
  workspaceId: string;
  pty: IPty;
  cwd: string;
  outputBuffer: string;
}

@Injectable()
export class PtyService implements OnModuleDestroy {
  private sessions = new Map<string, PtySession>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  create(
    workspaceId: string,
    cwd: string,
    cols: number,
    rows: number,
  ): PtySession {
    const id = nanoid();
    const proc = pty.spawn('claude', [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    const session: PtySession = {
      id,
      workspaceId,
      pty: proc,
      cwd,
      outputBuffer: '',
    };

    proc.onData((data) => {
      session.outputBuffer += data;
      if (session.outputBuffer.length > OUTPUT_BUFFER_MAX) {
        session.outputBuffer = session.outputBuffer.slice(
          session.outputBuffer.length - OUTPUT_BUFFER_MAX,
        );
      }
    });

    proc.onExit(({ exitCode }) => {
      this.sessions.delete(id);
      this.eventEmitter.emit('session.exited', {
        sessionId: id,
        exitCode,
      });
    });

    this.sessions.set(id, session);
    return session;
  }

  findById(id: string): PtySession | undefined {
    return this.sessions.get(id);
  }

  findByWorkspaceId(workspaceId: string): PtySession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.workspaceId === workspaceId,
    );
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
  }

  destroyByWorkspaceId(workspaceId: string): void {
    for (const session of this.findByWorkspaceId(workspaceId)) {
      this.destroy(session);
    }
  }

  getBufferedOutput(session: PtySession): string {
    return session.outputBuffer;
  }

  @OnEvent('workspace.deleted')
  handleWorkspaceDeleted({ workspaceId }: { workspaceId: string }): void {
    this.destroyByWorkspaceId(workspaceId);
  }

  onModuleDestroy(): void {
    for (const session of this.sessions.values()) {
      session.pty.kill();
    }
    this.sessions.clear();
  }
}
