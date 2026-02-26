import { mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface AppConfig {
  http: {
    host: string;
    port: number;
  };
  dir: {
    data: string;
  };
}

function ensureDataDir(): string {
  const dir = process.env.DATA_DIR || join(homedir(), '.altaria');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const config = (): { root: AppConfig } => ({
  root: {
    http: {
      host: process.env.HOST || '127.0.0.1',
      port: parseInt(process.env.PORT || '13340', 10),
    },
    dir: {
      data: ensureDataDir(),
    },
  },
});
