import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import { Repository } from 'typeorm';

import { SessionEntity } from '../../core/entities/session.entity';
import { TmuxService } from './tmux.service';

export interface PtyAttachment {
  sessionId: string;
  pty: IPty;
}

@Injectable()
export class PtyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PtyService.name);
  private attachments = new Map<string, PtyAttachment>();

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    private readonly tmuxService: TmuxService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    const sessions = await this.sessionRepository.find();
    for (const session of sessions) {
      const alive = await this.tmuxService.hasSession(session.tmuxSessionName);
      if (!alive) {
        this.logger.warn(
          `Removing stale session ${session.id} (tmux session ${session.tmuxSessionName} not found)`,
        );
        await this.sessionRepository.delete(session.id);
      }
    }
  }

  async create(
    workspaceId: string,
    cwd: string,
    cols: number,
    rows: number,
    agentType: string = 'claude',
    args: string[] = [],
  ): Promise<SessionEntity> {
    const id = nanoid();
    const tmuxSessionName = `altaria-${id}`;
    const command = this.resolveCommand(agentType);

    await this.tmuxService.createSession({
      sessionName: tmuxSessionName,
      command,
      args,
      cwd,
      cols,
      rows,
    });

    const session = this.sessionRepository.create({
      id,
      workspaceId,
      agentType,
      args: JSON.stringify(args),
      cwd,
      tmuxSessionName,
    });

    await this.sessionRepository.save(session);
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

  async findById(id: string): Promise<SessionEntity | null> {
    return this.sessionRepository.findOneBy({ id });
  }

  async findByWorkspaceId(workspaceId: string): Promise<SessionEntity[]> {
    return this.sessionRepository.findBy({ workspaceId });
  }

  async attach(
    sessionId: string,
    cols: number,
    rows: number,
  ): Promise<{ attachmentId: string; pty: IPty; scrollback: string }> {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const alive = await this.tmuxService.hasSession(session.tmuxSessionName);
    if (!alive) {
      await this.sessionRepository.delete(sessionId);
      throw new Error(`tmux session ${session.tmuxSessionName} is dead`);
    }

    const scrollback = await this.tmuxService.capturePane(
      session.tmuxSessionName,
    );

    const attachPty = pty.spawn(
      'tmux',
      ['attach-session', '-t', session.tmuxSessionName],
      {
        name: 'xterm-256color',
        cols,
        rows,
        env: { ...process.env, TERM: 'xterm-256color' },
      },
    );

    const attachmentId = nanoid();
    this.attachments.set(attachmentId, { sessionId, pty: attachPty });

    attachPty.onExit(() => {
      this.attachments.delete(attachmentId);
      // Check if the tmux session died (not just the attachment)
      void this.tmuxService
        .hasSession(session.tmuxSessionName)
        .then((alive) => {
          if (!alive) {
            void this.sessionRepository.delete(sessionId).then(() => {
              this.eventEmitter.emit('session.exited', {
                sessionId,
                exitCode: 0,
              });
            });
          }
        });
    });

    return { attachmentId, pty: attachPty, scrollback };
  }

  detach(attachmentId: string): void {
    const attachment = this.attachments.get(attachmentId);
    if (attachment) {
      attachment.pty.kill();
      this.attachments.delete(attachmentId);
    }
  }

  write(attachmentId: string, data: string): void {
    const attachment = this.attachments.get(attachmentId);
    if (attachment) {
      attachment.pty.write(data);
    }
  }

  resize(attachmentId: string, cols: number, rows: number): void {
    const attachment = this.attachments.get(attachmentId);
    if (attachment) {
      attachment.pty.resize(
        Math.max(2, Math.floor(cols)),
        Math.max(1, Math.floor(rows)),
      );
    }
  }

  async destroy(sessionId: string): Promise<void> {
    // Kill all attachments for this session
    for (const [id, attachment] of this.attachments.entries()) {
      if (attachment.sessionId === sessionId) {
        attachment.pty.kill();
        this.attachments.delete(id);
      }
    }

    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (session) {
      await this.tmuxService.killSession(session.tmuxSessionName);
      await this.sessionRepository.delete(sessionId);
    }

    this.eventEmitter.emit('session.exited', { sessionId, exitCode: 0 });
  }

  async destroyByWorkspaceId(workspaceId: string): Promise<void> {
    const sessions = await this.findByWorkspaceId(workspaceId);
    for (const session of sessions) {
      await this.destroy(session.id);
    }
  }

  @OnEvent('workspace.deleted')
  async handleWorkspaceDeleted({
    workspaceId,
  }: {
    workspaceId: string;
  }): Promise<void> {
    await this.destroyByWorkspaceId(workspaceId);
  }

  onModuleDestroy(): void {
    // Only kill attachment PTY processes, NOT tmux sessions
    for (const attachment of this.attachments.values()) {
      attachment.pty.kill();
    }
    this.attachments.clear();
  }
}
