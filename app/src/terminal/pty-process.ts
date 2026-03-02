import {
  closeFd,
  killProcess,
  readPty,
  resizePty,
  setNonBlock,
  spawnPty,
  waitProcess,
  writePty,
} from './ffi.ts';

const SIGTERM = 15;
const SIGKILL = 9;
const POLL_INTERVAL_MS = 5;
const KILL_GRACE_MS = 100;

export class PtyProcess {
  readonly masterFd: number;
  readonly childPid: number;

  private pollTimer: Timer | null = null;
  private alive = true;

  private constructor(masterFd: number, childPid: number) {
    this.masterFd = masterFd;
    this.childPid = childPid;
  }

  get isAlive(): boolean {
    return this.alive;
  }

  static spawn(rows = 24, cols = 80): PtyProcess {
    const { pid, masterFd } = spawnPty(rows, cols);
    setNonBlock(masterFd);
    return new PtyProcess(masterFd, pid);
  }

  startReading(
    onData: (data: Uint8Array) => void,
    onExit: (exitCode: number) => void,
  ): void {
    this.pollTimer = setInterval(() => {
      if (!this.alive) return;

      // Drain all available data
      for (;;) {
        const data = readPty(this.masterFd);
        if (!data) break;
        onData(data);
      }

      // Check if child has exited
      const exitCode = waitProcess(this.childPid);
      if (exitCode !== 0 || !this.alive) {
        // exitCode > 0 means process exited (waitProcess returns status)
        // We need to distinguish "still running" (returns 0) from "exited with 0"
        // waitProcess returns 0 for "still running", so we re-check
        if (exitCode !== 0) {
          this.alive = false;
          this.stopPolling();
          closeFd(this.masterFd);
          onExit(exitCode);
        }
      }
    }, POLL_INTERVAL_MS);
  }

  write(data: Uint8Array): void {
    if (!this.alive) return;
    writePty(this.masterFd, data);
  }

  resize(rows: number, cols: number): void {
    if (!this.alive) return;
    resizePty(this.masterFd, rows, cols);
  }

  kill(): void {
    if (!this.alive) return;
    this.alive = false;
    this.stopPolling();

    killProcess(this.childPid, SIGTERM);

    setTimeout(() => {
      // Force kill if still running
      const status = waitProcess(this.childPid);
      if (status === 0) {
        killProcess(this.childPid, SIGKILL);
      }
      closeFd(this.masterFd);
    }, KILL_GRACE_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
