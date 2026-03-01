import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

@Injectable()
export class TmuxService {
  async createSession(options: {
    sessionName: string;
    command: string;
    args: string[];
    cwd: string;
    cols: number;
    rows: number;
  }): Promise<void> {
    const tmuxArgs = [
      'new-session',
      '-d',
      '-s',
      options.sessionName,
      '-x',
      String(options.cols),
      '-y',
      String(options.rows),
      options.command,
      ...options.args,
    ];

    await execFileAsync('tmux', tmuxArgs, {
      cwd: options.cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    // Disable status bar (prevents horizontal overflow on narrow screens)
    // and enable mouse support (allows scroll-through for touch devices)
    await execFileAsync('tmux', [
      'set-option',
      '-t',
      options.sessionName,
      'status',
      'off',
    ]);
    await execFileAsync('tmux', [
      'set-option',
      '-t',
      options.sessionName,
      'mouse',
      'on',
    ]);
  }

  async hasSession(name: string): Promise<boolean> {
    try {
      await execFileAsync('tmux', ['has-session', '-t', name]);
      return true;
    } catch {
      return false;
    }
  }

  async killSession(name: string): Promise<void> {
    try {
      await execFileAsync('tmux', ['kill-session', '-t', name]);
    } catch {
      // Session may already be dead
    }
  }

  async resizeWindow(name: string, cols: number, rows: number): Promise<void> {
    try {
      await execFileAsync('tmux', [
        'resize-window',
        '-t',
        name,
        '-x',
        String(cols),
        '-y',
        String(rows),
      ]);
    } catch {
      // Session may not exist
    }
  }

  async capturePane(name: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync('tmux', [
        'capture-pane',
        '-t',
        name,
        '-p',
        '-S',
        '-',
        '-e',
      ]);
      return stdout;
    } catch {
      return '';
    }
  }
}
