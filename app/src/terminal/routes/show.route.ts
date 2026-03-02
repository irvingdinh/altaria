import type { ServerWebSocket, WebSocketHandler } from 'bun';

import { sessionManager } from '../session-manager.ts';

export type WsData = {
  terminalId: string;
};

export const showWebSocket: WebSocketHandler<WsData> = {
  open(ws: ServerWebSocket<WsData>) {
    const { terminalId } = ws.data;
    console.log(`WebSocket connected: terminal=${terminalId}`);
    sessionManager.attach(terminalId, ws);
  },
  message(ws: ServerWebSocket<WsData>, message: string | Buffer) {
    const { terminalId } = ws.data;
    const data =
      typeof message === 'string'
        ? new TextEncoder().encode(message)
        : new Uint8Array(message);
    sessionManager.write(terminalId, data);
  },
  close(ws: ServerWebSocket<WsData>) {
    console.log(`WebSocket disconnected: terminal=${ws.data.terminalId}`);
    sessionManager.detach(ws);
  },
};
