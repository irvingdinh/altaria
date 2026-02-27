import { ValidationPipe } from '@nestjs/common';
import { NestApplication, NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { mkdtempSync, rmSync } from 'fs';
import { createServer } from 'net';
import { tmpdir } from 'os';
import { join, posix } from 'path';

import { AppModule } from '../src/app.module';

const env = {
  PORT: 0,
  TEMP_DATA_DIR: '',
};

export async function createTestApp(): Promise<NestApplication> {
  if (env.PORT === 0) env.PORT = await getAvailablePort();
  if (env.TEMP_DATA_DIR === '') env.TEMP_DATA_DIR = ensureTempDataDir();

  const app: NestApplication = await NestFactory.create(AppModule, {
    logger: ['error'],
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(env.PORT);

  return app;
}

export async function destroyTestApp(app: NestApplication): Promise<void> {
  await app.close();
  removeTempDataDir();
}

function ensureTempDataDir(): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'altaria-test-'));
  process.env.DATA_DIR = tempDir;
  return tempDir;
}

function removeTempDataDir(): void {
  if (env.TEMP_DATA_DIR) {
    rmSync(env.TEMP_DATA_DIR, { recursive: true, force: true });
    env.TEMP_DATA_DIR = '';
  }
}

export const withUrl = (...paths: string[]) => {
  const pathname = posix.join('/', ...paths);
  return `http://localhost:${env.PORT}${pathname}`;
};

export const withWsUrl = (...paths: string[]) => {
  const pathname = posix.join('/', ...paths);
  return `ws://localhost:${env.PORT}${pathname}`;
};

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Failed to get port')));
      }
    });
    server.on('error', reject);
  });
}
