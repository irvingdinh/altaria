import type { RestRoute } from '../../core/types.ts';
import { sessionManager } from '../session-manager.ts';

export const sessionRestRoutes: RestRoute[] = [
  {
    method: 'POST',
    pattern: /^\/api\/sessions$/,
    async handler(req) {
      let cwd: string | undefined;
      try {
        const body = (await req.json()) as { cwd?: string };
        cwd = body.cwd || undefined;
      } catch {
        // No body or invalid JSON — proceed without cwd
      }

      const id = crypto.randomUUID();
      const session = sessionManager.getOrCreate(id, cwd);
      return Response.json(
        { id, cwd: cwd ?? null, createdAt: session.createdAt, clientCount: 0 },
        { status: 201 },
      );
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/sessions$/,
    handler() {
      return Response.json(sessionManager.list());
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/sessions\/([^/]+)$/,
    handler(_req, match) {
      const id = match[1];
      if (!id || !sessionManager.destroy(id)) {
        return new Response(null, { status: 404 });
      }
      return new Response(null, { status: 204 });
    },
  },
];
