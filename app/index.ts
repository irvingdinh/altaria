import { showWebSocket } from './src/terminal/routes/show.route.ts';

Bun.serve({
  port: 23340,
  fetch(req, server) {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/ws\/terminals\/(.+)$/);
    const terminalId = match?.[1];

    if (terminalId) {
      const upgraded = server.upgrade(req, {
        data: { terminalId },
      });
      if (upgraded) return;
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    return new Response('Not found', { status: 404 });
  },
  websocket: showWebSocket,
});

console.log('Server running on http://localhost:23340');
