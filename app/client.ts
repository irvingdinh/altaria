const terminalId = process.argv[2] || 'default';
const ws = new WebSocket(`ws://localhost:23340/ws/terminals/${terminalId}`);
ws.binaryType = 'arraybuffer';

ws.addEventListener('open', () => {
  console.log(`Connected to terminal: ${terminalId}`);
  console.log('Type commands below. Press Ctrl+C to disconnect.\n');

  // Read stdin and send to WebSocket
  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.on('data', (chunk: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(chunk);
    }
  });
});

ws.addEventListener('message', (event) => {
  const data = new Uint8Array(event.data as ArrayBuffer);
  process.stdout.write(data);
});

ws.addEventListener('close', (event) => {
  console.log(`\nDisconnected: ${event.reason || 'connection closed'}`);
  process.exit(0);
});

ws.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
  process.exit(1);
});
