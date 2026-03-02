import { cc, ptr } from 'bun:ffi';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import source from './native/pty.c' with { type: 'file' };

const EAGAIN = 35; // macOS; Linux is 11 but handled by -errno pattern

const lib = cc({
  source: source as string,
  library: process.platform === 'linux' ? ['util'] : [],
  symbols: {
    spawn_pty: {
      args: ['ptr', 'i32', 'i32'],
      returns: 'i32',
    },
    read_pty: {
      args: ['i32', 'ptr', 'u32'],
      returns: 'i32',
    },
    write_pty: {
      args: ['i32', 'ptr', 'u32'],
      returns: 'i32',
    },
    set_nonblock: {
      args: ['i32'],
      returns: 'i32',
    },
    close_fd: {
      args: ['i32'],
      returns: 'i32',
    },
    kill_process: {
      args: ['i32', 'i32'],
      returns: 'i32',
    },
    wait_process: {
      args: ['i32'],
      returns: 'i32',
    },
    resize_pty: {
      args: ['i32', 'i32', 'i32'],
      returns: 'i32',
    },
  },
});

const { symbols } = lib;

export function spawnPty(
  rows: number,
  cols: number,
): { pid: number; masterFd: number } {
  const fdOut = new Int32Array(1);
  const pid = symbols.spawn_pty(ptr(fdOut), rows, cols);
  if (pid < 0) {
    throw new Error(`spawn_pty failed: errno ${-pid}`);
  }
  return { pid, masterFd: fdOut[0]! };
}

const readBuf = new Uint8Array(65536);

export function readPty(fd: number): Uint8Array | null {
  const n = symbols.read_pty(fd, ptr(readBuf), readBuf.length);
  if (n < 0) {
    const errNo = -n;
    if (errNo === EAGAIN || errNo === 11) {
      return null; // No data available (non-blocking)
    }
    return null; // EIO or other error — treat as no data
  }
  if (n === 0) {
    return null;
  }
  return readBuf.slice(0, n);
}

export function writePty(fd: number, data: Uint8Array): number {
  const n = symbols.write_pty(fd, ptr(data), data.length);
  if (n < 0) {
    throw new Error(`write_pty failed: errno ${-n}`);
  }
  return n;
}

export function setNonBlock(fd: number): void {
  const result = symbols.set_nonblock(fd);
  if (result < 0) {
    throw new Error(`set_nonblock failed: errno ${-result}`);
  }
}

export function closeFd(fd: number): void {
  symbols.close_fd(fd);
}

export function killProcess(pid: number, signal: number): void {
  symbols.kill_process(pid, signal);
}

export function waitProcess(pid: number): number {
  return symbols.wait_process(pid);
}

export function resizePty(fd: number, rows: number, cols: number): void {
  const result = symbols.resize_pty(fd, rows, cols);
  if (result < 0) {
    throw new Error(`resize_pty failed: errno ${-result}`);
  }
}
