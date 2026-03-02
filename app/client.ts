const terminalId = process.argv[2] || 'default';
const ws = new WebSocket(`ws://localhost:23340/ws/terminals/${terminalId}`);

ws.addEventListener('open', () => {
  console.log(`Connected to terminal: ${terminalId}`);
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data as string) as {
    terminalId: string;
    count: number;
    timestamp: string;
  };
  console.log(`[${data.terminalId}] #${data.count} — ${data.timestamp}`);
});

ws.addEventListener('close', () => {
  console.log('Disconnected');
  process.exit(0);
});

ws.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
  process.exit(1);
});
