import {
  createFetchHandler,
  createWebSocketHandler,
  registerModule,
  shutdownAll,
} from './src/core/router.ts';
import { filesystemModule } from './src/filesystem';
import { terminalModule } from './src/terminal';

registerModule(filesystemModule());
registerModule(terminalModule());

const server = Bun.serve({
  port: 23340,
  fetch: createFetchHandler(),
  websocket: createWebSocketHandler(),
});

function shutdown() {
  console.log('\nShutting down...');
  shutdownAll();
  server
    .stop()
    .catch(console.error)
    .finally(() => {
      process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Server running on http://localhost:23340');
