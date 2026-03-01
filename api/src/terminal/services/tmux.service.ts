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
