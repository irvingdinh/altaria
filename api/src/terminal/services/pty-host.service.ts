import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { ChildProcess, fork } from 'child_process';
import { nanoid } from 'nanoid';
import { join } from 'path';
import { Repository } from 'typeorm';

import { SessionEntity } from '../../core/entities/session.entity';
import {
  BufferConstants,
  HeartbeatConstants,
  type PtyHostRequest,
  PtyHostRequestType,
  type PtyHostResponse,
  PtyHostResponseType,
} from '../pty-host/pty-host.protocol';

type DataCallback = (data: string) => void;

interface SessionState {
  sessionId: string;
  dataCallbacks: Set<DataCallback>;
}

@Injectable()
export class PtyHostService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PtyHostService.name);

  private ptyHost: ChildProcess | null = null;
  private sessions = new Map<string, SessionState>();
  private restartCount = 0;
  private wasQuitRequested = false;
  private isResponsive = true;
  private heartbeatFirstTimeout: NodeJS.Timeout | null = null;
  private heartbeatSecondTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private serializeInterval: NodeJS.Timeout | null = null;
  private pendingCreates = new Map<
    string,
    { resolve: () => void; reject: (err: Error) => void }
  >();

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    const stale = await this.sessionRepository.count();
    if (stale > 0) {
      this.logger.warn(`Clearing ${stale} stale session(s) from previous run`);
      await this.sessionRepository.clear();
    }
    this.startPtyHost();
  }

  onModuleDestroy(): void {
    this.wasQuitRequested = true;
    this.stopHeartbeat();
    this.stopSerializeInterval();
    if (this.ptyHost) {
      this.sendToHost({ type: PtyHostRequestType.Shutdown });
      this.ptyHost.kill();
      this.ptyHost = null;
    }
  }

  private startPtyHost(): void {
    const hostPath = join(__dirname, '../pty-host/pty-host.main.js');

    this.ptyHost = fork(hostPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    this.ptyHost.stdout?.on('data', (data: Buffer) => {
      this.logger.debug(`[pty-host stdout] ${data.toString().trim()}`);
    });

    this.ptyHost.stderr?.on('data', (data: Buffer) => {
      this.logger.error(`[pty-host stderr] ${data.toString().trim()}`);
    });

    this.ptyHost.on('message', (msg: PtyHostResponse) => {
      this.handleHostMessage(msg);
    });

    this.ptyHost.on('exit', (code) => {
      this.handleHostExit(code);
    });

    this.ptyHost.on('error', (error) => {
      this.logger.error(`PTY host error: ${error.message}`);
    });

    this.startHeartbeat();
    this.startSerializeInterval();
    this.logger.log('PTY host process started');
  }

  private handleHostMessage(msg: PtyHostResponse): void {
    switch (msg.type) {
      case PtyHostResponseType.Ready:
        this.logger.log('PTY host ready');
        this.handleHeartbeat();
        break;

      case PtyHostResponseType.Heartbeat:
        this.handleHeartbeat();
        break;

      case PtyHostResponseType.Data:
        this.handleData(msg.sessionId, msg.data);
        break;

      case PtyHostResponseType.Exit:
        this.handleExit(msg.sessionId, msg.exitCode);
        break;

      case PtyHostResponseType.Created:
        this.handleCreated(msg.sessionId);
        break;

      case PtyHostResponseType.SerializedBuffer:
        this.handleSerializedBuffer(msg.sessionId, msg.buffer);
        break;

      case PtyHostResponseType.Error:
        this.logger.error(
          `PTY host error${msg.sessionId ? ` [${msg.sessionId}]` : ''}: ${msg.message}`,
        );
        if (msg.sessionId) {
          const pending = this.pendingCreates.get(msg.sessionId);
          if (pending) {
            pending.reject(new Error(msg.message));
            this.pendingCreates.delete(msg.sessionId);
          }
        }
        break;
    }
  }

  private handleHostExit(code: number | null): void {
    this.logger.warn(`PTY host exited with code ${code}`);
    this.clearHeartbeatTimeouts();

    if (!this.wasQuitRequested) {
      if (this.restartCount < HeartbeatConstants.MaxRestarts) {
        this.restartCount++;
        this.logger.warn(
          `Restarting PTY host (attempt ${this.restartCount}/${HeartbeatConstants.MaxRestarts})`,
        );
        this.restartPtyHost();
      } else {
        this.logger.error('PTY host exceeded max restarts, giving up');
      }
    }
  }

  private restartPtyHost(): void {
    for (const [sessionId, state] of this.sessions.entries()) {
      this.eventEmitter.emit('session.exited', { sessionId, exitCode: -1 });
      state.dataCallbacks.clear();
    }
    this.sessions.clear();

    this.stopHeartbeat();
    this.stopSerializeInterval();

    if (this.ptyHost) {
      this.ptyHost.removeAllListeners();
      this.ptyHost.kill();
      this.ptyHost = null;
    }

    this.startPtyHost();
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendToHost({ type: PtyHostRequestType.Heartbeat });
    }, HeartbeatConstants.BeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clearHeartbeatTimeouts();
  }

  private clearHeartbeatTimeouts(): void {
    if (this.heartbeatFirstTimeout) {
      clearTimeout(this.heartbeatFirstTimeout);
      this.heartbeatFirstTimeout = null;
    }
    if (this.heartbeatSecondTimeout) {
      clearTimeout(this.heartbeatSecondTimeout);
      this.heartbeatSecondTimeout = null;
    }
  }

  private handleHeartbeat(): void {
    this.clearHeartbeatTimeouts();

    this.heartbeatFirstTimeout = setTimeout(
      () => this.handleHeartbeatFirstTimeout(),
      HeartbeatConstants.BeatInterval * HeartbeatConstants.FirstWaitMultiplier,
    );

    if (!this.isResponsive) {
      this.isResponsive = true;
      this.logger.log('PTY host became responsive');
    }
  }

  private handleHeartbeatFirstTimeout(): void {
    this.logger.warn(
      `No PTY host heartbeat after ${(HeartbeatConstants.BeatInterval * HeartbeatConstants.FirstWaitMultiplier) / 1000}s`,
    );
    this.heartbeatFirstTimeout = null;

    this.heartbeatSecondTimeout = setTimeout(
      () => this.handleHeartbeatSecondTimeout(),
      HeartbeatConstants.BeatInterval * HeartbeatConstants.SecondWaitMultiplier,
    );
  }

  private handleHeartbeatSecondTimeout(): void {
    this.heartbeatSecondTimeout = null;
    if (this.isResponsive) {
      this.isResponsive = false;
      this.logger.error('PTY host unresponsive');
    }
  }

  private startSerializeInterval(): void {
    this.serializeInterval = setInterval(() => {
      for (const sessionId of this.sessions.keys()) {
        this.sendToHost({
          type: PtyHostRequestType.SerializeBuffer,
          sessionId,
        });
      }
    }, BufferConstants.SerializeInterval);
  }

  private stopSerializeInterval(): void {
    if (this.serializeInterval) {
      clearInterval(this.serializeInterval);
      this.serializeInterval = null;
    }
  }

  private sendToHost(msg: PtyHostRequest): void {
    if (this.ptyHost && this.ptyHost.connected) {
      this.ptyHost.send(msg);
    }
  }

  private handleData(sessionId: string, data: string): void {
    const state = this.sessions.get(sessionId);
    if (state) {
      for (const callback of state.dataCallbacks) {
        callback(data);
      }
    }
  }

  private handleExit(sessionId: string, exitCode: number): void {
    this.sessions.delete(sessionId);
    void this.sessionRepository.delete(sessionId).then(() => {
      this.eventEmitter.emit('session.exited', { sessionId, exitCode });
    });
  }

  private handleCreated(sessionId: string): void {
    const pending = this.pendingCreates.get(sessionId);
    if (pending) {
      pending.resolve();
      this.pendingCreates.delete(sessionId);
    }
  }

  private handleSerializedBuffer(sessionId: string, buffer: string): void {
    void this.sessionRepository.update(sessionId, { serializedBuffer: buffer });
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
    const command = this.resolveCommand(agentType);

    const env: Record<string, string> = { ...process.env } as Record<
      string,
      string
    >;

    let shellIntegrationPath: string | undefined;

    if (agentType === 'native') {
      env.TERM_PROGRAM = 'altaria';
      shellIntegrationPath = this.resolveShellIntegrationPath(command);
    }

    await new Promise<void>((resolve, reject) => {
      this.pendingCreates.set(id, { resolve, reject });

      this.sendToHost({
        type: PtyHostRequestType.Create,
        sessionId: id,
        command,
        args,
        cwd,
        cols,
        rows,
        env,
        shellIntegrationPath,
      });

      setTimeout(() => {
        if (this.pendingCreates.has(id)) {
          this.pendingCreates.delete(id);
          reject(new Error('Timeout waiting for PTY creation'));
        }
      }, 10000);
    });

    this.sessions.set(id, { sessionId: id, dataCallbacks: new Set() });

    const session = this.sessionRepository.create({
      id,
      workspaceId,
      agentType,
      args: JSON.stringify(args),
      cwd,
      serializedBuffer: null,
      detached: false,
    });

    await this.sessionRepository.save(session);
    return session;
  }

  private resolveShellIntegrationPath(command: string): string | undefined {
    const shellName = command.split('/').pop()?.toLowerCase();
    const basePath = join(__dirname, '../shell-integration');

    switch (shellName) {
      case 'bash':
        return join(basePath, 'shellIntegration-bash.sh');
      case 'zsh':
        return join(basePath, 'shellIntegration-zsh.sh');
      case 'fish':
        return join(basePath, 'shellIntegration-fish.fish');
      default:
        return undefined;
    }
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

  attach(sessionId: string): { onData: (cb: DataCallback) => () => void } {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      onData: (cb: DataCallback) => {
        state.dataCallbacks.add(cb);
        return () => {
          state.dataCallbacks.delete(cb);
        };
      },
    };
  }

  write(sessionId: string, data: string): void {
    if (this.sessions.has(sessionId)) {
      this.sendToHost({
        type: PtyHostRequestType.Write,
        sessionId,
        data,
      });
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    if (this.sessions.has(sessionId)) {
      this.sendToHost({
        type: PtyHostRequestType.Resize,
        sessionId,
        cols,
        rows,
      });
    }
  }

  acknowledgeData(sessionId: string, charCount: number): void {
    if (this.sessions.has(sessionId)) {
      this.sendToHost({
        type: PtyHostRequestType.AcknowledgeData,
        sessionId,
        charCount,
      });
    }
  }

  async getSerializedBuffer(sessionId: string): Promise<string | null> {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    return session?.serializedBuffer ?? null;
  }

  async destroy(sessionId: string): Promise<void> {
    this.sendToHost({
      type: PtyHostRequestType.Destroy,
      sessionId,
    });

    const state = this.sessions.get(sessionId);
    if (state) {
      state.dataCallbacks.clear();
      this.sessions.delete(sessionId);
    }

    await this.sessionRepository.delete(sessionId);
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

  async detach(sessionId: string): Promise<void> {
    this.sendToHost({
      type: PtyHostRequestType.SerializeBuffer,
      sessionId,
    });

    await this.sessionRepository.update(sessionId, { detached: true });
  }

  async reattach(sessionId: string): Promise<string | null> {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (!session) {
      return null;
    }

    await this.sessionRepository.update(sessionId, { detached: false });
    return session.serializedBuffer;
  }

  isSessionActive(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}
