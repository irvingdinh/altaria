import type { ServerWebSocket, WebSocketHandler } from 'bun';

export type WsData = {
  terminalId: string;
  interval?: Timer;
};

export const showWebSocket: WebSocketHandler<WsData> = {
  open(ws: ServerWebSocket<WsData>) {
    const { terminalId } = ws.data;
    console.log(`WebSocket connected: terminal=${terminalId}`);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      const data = JSON.stringify({
        terminalId,
        count,
        timestamp: new Date().toISOString(),
      });
      ws.send(data);
    }, 1000);

    ws.data.interval = interval;
  },
  message(ws: ServerWebSocket<WsData>, message: string | Buffer) {
    console.log(`[${ws.data.terminalId}] Received:`, message.toString());
  },
  close(ws: ServerWebSocket<WsData>) {
    console.log(`WebSocket disconnected: terminal=${ws.data.terminalId}`);
    if (ws.data.interval) {
      clearInterval(ws.data.interval);
    }
  },
};
