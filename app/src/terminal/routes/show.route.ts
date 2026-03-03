import type { ServerWebSocket, WebSocketHandler } from 'bun';

import type { WsData } from '../../core/types.ts';
import { sessionManager } from '../session-manager.ts';

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

    if (data.length === 0) return;

    const prefix = data[0]!;
    if (prefix === 0x00) {
      sessionManager.write(terminalId, data.subarray(1));
    } else if (prefix === 0x01) {
      if (data.length < 5) return;
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const cols = view.getUint16(1);
      const rows = view.getUint16(3);
      sessionManager.resize(terminalId, rows, cols);
    } else {
      console.warn(`Unknown WS prefix byte: 0x${prefix.toString(16)}`);
    }
  },
  close(ws: ServerWebSocket<WsData>) {
    console.log(`WebSocket disconnected: terminal=${ws.data.terminalId}`);
    sessionManager.detach(ws);
  },
};
