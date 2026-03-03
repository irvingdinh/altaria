import { resolve, normalize } from 'node:path';

import type { Server, WebSocketHandler } from 'bun';

import type { ModuleRoutes, RestRoute, WsData, WsRoute } from './types.ts';

const restRoutes: RestRoute[] = [];
const wsRoutes: WsRoute[] = [];
const shutdownHooks: (() => void)[] = [];

const STATIC_ROOT = resolve(import.meta.dir, '../../../ui/dist');

export function registerModule(routes: ModuleRoutes): void {
  if (routes.rest) restRoutes.push(...routes.rest);
  if (routes.ws) wsRoutes.push(...routes.ws);
  if (routes.shutdown) shutdownHooks.push(routes.shutdown);
}

async function serveStatic(pathname: string): Promise<Response | null> {
  const indexPath = resolve(STATIC_ROOT, 'index.html');
  const indexFile = Bun.file(indexPath);
  if (!(await indexFile.exists())) return null;

  const relative = normalize(pathname.replace(/^\/+/, ''));
  const filePath = resolve(STATIC_ROOT, relative);
  if (!filePath.startsWith(STATIC_ROOT)) {
    return new Response('Forbidden', { status: 403 });
  }

  const file = Bun.file(filePath);
  if (await file.exists()) return new Response(file);

  return new Response(Bun.file(indexPath), {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  });
}

export function createFetchHandler(): (
  req: Request,
  server: Server<any>,
) => Response | Promise<Response> | undefined {
  return (req: Request, server: Server<any>) => {
    const url = new URL(req.url);

    for (const route of wsRoutes) {
      const match = url.pathname.match(route.pattern);
      if (!match) continue;

      const data = route.upgrade(req, match, server);
      if (!data) continue;

      // @ts-expect-error Lorem ipsum dolor sit amet
      const upgraded = server.upgrade(req, { data });
      if (upgraded) return;
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    for (const route of restRoutes) {
      if (route.method !== req.method) continue;
      const match = url.pathname.match(route.pattern);
      if (!match) continue;
      return route.handler(req, match, server);
    }

    return serveStatic(url.pathname).then(
      (r) => r ?? new Response('Not found', { status: 404 }),
    );
  };
}

export function createWebSocketHandler(): WebSocketHandler<WsData> {
  const handler = wsRoutes[0]?.handler;
  if (!handler) throw new Error('No WebSocket handler registered');
  return handler;
}

export function shutdownAll(): void {
  for (const hook of shutdownHooks) {
    hook();
  }
}
