/**
 * PTY Service running inside the child process.
 * Manages PTY instances with flow control support.
 */

import type { IPty } from 'node-pty';
import * as pty from 'node-pty';

import {
  BufferConstants,
  FlowControlConstants,
  type PtyHostRequest,
  PtyHostRequestType,
  type PtyHostResponse,
  PtyHostResponseType,
} from './pty-host.protocol';

interface PtySession {
  sessionId: string;
  pty: IPty;
  unacknowledgedCharCount: number;
  isPaused: boolean;
  buffer: string[];
}

export class PtyServiceChild {
  private sessions = new Map<string, PtySession>();

  constructor(private readonly send: (msg: PtyHostResponse) => void) {}

  handleMessage(msg: PtyHostRequest): void {
    switch (msg.type) {
      case PtyHostRequestType.Create:
        this.handleCreate(msg);
        break;
      case PtyHostRequestType.Write:
        this.handleWrite(msg.sessionId, msg.data);
        break;
      case PtyHostRequestType.Resize:
        this.handleResize(msg.sessionId, msg.cols, msg.rows);
        break;
      case PtyHostRequestType.Destroy:
        this.handleDestroy(msg.sessionId);
        break;
      case PtyHostRequestType.Heartbeat:
        this.send({ type: PtyHostResponseType.Heartbeat });
        break;
      case PtyHostRequestType.AcknowledgeData:
        this.handleAcknowledgeData(msg.sessionId, msg.charCount);
        break;
      case PtyHostRequestType.SerializeBuffer:
        this.handleSerializeBuffer(msg.sessionId);
        break;
      case PtyHostRequestType.Shutdown:
        this.handleShutdown();
        break;
    }
  }

  private handleCreate(msg: {
    sessionId: string;
    command: string;
    args: string[];
    cwd: string;
    cols: number;
    rows: number;
    env: Record<string, string>;
    shellIntegrationPath?: string;
  }): void {
    try {
      const env: Record<string, string> = {
        ...msg.env,
        TERM: 'xterm-256color',
      };

      if (msg.shellIntegrationPath) {
        const shellName = msg.command.split('/').pop()?.toLowerCase();
        if (shellName === 'bash') {
          env['BASH_ENV'] = msg.shellIntegrationPath;
        } else if (shellName === 'zsh') {
          env['ZDOTDIR_ALTARIA'] = msg.shellIntegrationPath;
        }
      }

      const ptyProcess = pty.spawn(msg.command, msg.args, {
        name: 'xterm-256color',
        cols: msg.cols,
        rows: msg.rows,
        cwd: msg.cwd,
        env,
      });

      const session: PtySession = {
        sessionId: msg.sessionId,
        pty: ptyProcess,
        unacknowledgedCharCount: 0,
        isPaused: false,
        buffer: [],
      };

      this.sessions.set(msg.sessionId, session);

      ptyProcess.onData((data) => {
        this.handlePtyData(session, data);
      });

      ptyProcess.onExit(({ exitCode }) => {
        this.sessions.delete(msg.sessionId);
        this.send({
          type: PtyHostResponseType.Exit,
          sessionId: msg.sessionId,
          exitCode,
        });
      });

      this.send({
        type: PtyHostResponseType.Created,
        sessionId: msg.sessionId,
      });
    } catch (error) {
      this.send({
        type: PtyHostResponseType.Error,
        sessionId: msg.sessionId,
        message:
          error instanceof Error ? error.message : 'Failed to create PTY',
      });
    }
  }

  private handlePtyData(session: PtySession, data: string): void {
    session.buffer.push(data);
    if (session.buffer.length > BufferConstants.MaxScrollback) {
      session.buffer.shift();
    }

    session.unacknowledgedCharCount += data.length;

    if (
      !session.isPaused &&
      session.unacknowledgedCharCount > FlowControlConstants.HighWatermarkChars
    ) {
      session.isPaused = true;
      session.pty.pause();
    }

    this.send({
      type: PtyHostResponseType.Data,
      sessionId: session.sessionId,
      data,
    });
  }

  private handleWrite(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.write(data);
    }
  }

  private handleResize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const safeCols = Math.max(2, Math.floor(cols));
      const safeRows = Math.max(1, Math.floor(rows));
      session.pty.resize(safeCols, safeRows);
    }
  }

  private handleDestroy(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.kill();
      this.sessions.delete(sessionId);
    }
  }

  private handleAcknowledgeData(sessionId: string, charCount: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.unacknowledgedCharCount = Math.max(
      session.unacknowledgedCharCount - charCount,
      0,
    );

    if (
      session.isPaused &&
      session.unacknowledgedCharCount < FlowControlConstants.LowWatermarkChars
    ) {
      session.isPaused = false;
      session.pty.resume();
    }
  }

  private handleSerializeBuffer(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.send({
        type: PtyHostResponseType.SerializedBuffer,
        sessionId,
        buffer: session.buffer.join(''),
      });
    } else {
      this.send({
        type: PtyHostResponseType.SerializedBuffer,
        sessionId,
        buffer: '',
      });
    }
  }

  private handleShutdown(): void {
    for (const session of this.sessions.values()) {
      session.pty.kill();
    }
    this.sessions.clear();
    process.exit(0);
  }
}
