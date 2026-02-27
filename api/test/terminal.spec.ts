import { NestApplication } from '@nestjs/core';
import WebSocket from 'ws';

import { createTestApp, destroyTestApp, withWsUrl } from './utils';

jest.setTimeout(30_000);

interface WsMessage {
  type: string;
  data?: string;
  code?: number;
  message?: string;
}

function waitForMessage(
  ws: WebSocket,
  type: string,
  timeout = 15_000,
): Promise<WsMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${type}" message`)),
      timeout,
    );

    const handler = (raw: Buffer | string) => {
      const msg = JSON.parse(
        typeof raw === 'string' ? raw : raw.toString(),
      ) as WsMessage;
      if (msg.type === type) {
        clearTimeout(timer);
        ws.removeListener('message', handler);
        resolve(msg);
      }
    };

    ws.on('message', handler);
  });
}

function connectWs(): WebSocket {
  return new WebSocket(withWsUrl('ws', 'terminal'));
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
}

describe('Terminal WebSocket', () => {
  let app: NestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(app);
  });

  it('should connect and receive output', async () => {
    const ws = connectWs();
    await waitForOpen(ws);

    const msg = await waitForMessage(ws, 'output');
    expect(msg.type).toBe('output');
    expect(typeof msg.data).toBe('string');

    ws.close();
  });

  it('should send input and receive output', async () => {
    const ws = connectWs();
    await waitForOpen(ws);

    await waitForMessage(ws, 'output');

    ws.send(JSON.stringify({ type: 'input', data: '/help\n' }));

    const msg = await waitForMessage(ws, 'output');
    expect(msg.type).toBe('output');
    expect(typeof msg.data).toBe('string');

    ws.close();
  });

  it('should handle resize without error', async () => {
    const ws = connectWs();
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'resize', cols: 120, rows: 40 }));

    // Collect messages for a short period to ensure no error is received
    const messages: WsMessage[] = [];
    const collectMessages = (raw: Buffer | string) => {
      messages.push(
        JSON.parse(typeof raw === 'string' ? raw : raw.toString()) as WsMessage,
      );
    };
    ws.on('message', collectMessages);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    ws.removeListener('message', collectMessages);

    const errorMessages = messages.filter((m) => m.type === 'error');
    expect(errorMessages).toHaveLength(0);

    ws.close();
  });

  it('should disconnect cleanly', async () => {
    const ws = connectWs();
    await waitForOpen(ws);

    await waitForMessage(ws, 'output');

    await new Promise<void>((resolve, reject) => {
      ws.on('close', () => resolve());
      ws.on('error', reject);
      ws.close();
    });
  });
});
