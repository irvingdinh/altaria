import type { ModuleRoutes } from '../core/types.ts';
import { sessionRestRoutes } from './routes/sessions.route.ts';
import { showWebSocket } from './routes/show.route.ts';
import { sessionManager } from './session-manager.ts';

export function terminalModule(): ModuleRoutes {
  return {
    rest: sessionRestRoutes,
    ws: [
      {
        pattern: /^\/ws\/terminals\/(.+)$/,
        upgrade(_req, match) {
          const terminalId = match[1];
          if (!terminalId) return null;
          return { terminalId };
        },
        handler: showWebSocket,
      },
    ],
    shutdown: () => sessionManager.shutdown(),
  };
}
