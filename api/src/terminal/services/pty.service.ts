import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { nanoid } from 'nanoid';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';

const OUTPUT_BUFFER_MAX = 50 * 1024; // 50 KB

export interface PtySession {
  id: string;
  workspaceId: string;
  agentType: string;
  args: string[];
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
    agentType: string = 'claude',
    args: string[] = [],
  ): PtySession {
    const id = nanoid();
    const command = this.resolveCommand(agentType);
    const proc = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    const session: PtySession = {
      id,
      workspaceId,
      agentType,
      args,
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

  private resolveCommand(agentType: string): string {
    switch (agentType) {
      case 'native':
        return (
          process.env.SHELL ||
          (process.platform === 'win32' ? 'cmd.exe' : 'bash')
        );
      case 'codex':
        return 'codex';
      case 'gemini':
        return 'gemini';
      case 'claude':
      default:
        return 'claude';
    }
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
    session.pty.resize(
      Math.max(2, Math.floor(cols)),
      Math.max(1, Math.floor(rows)),
    );
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
