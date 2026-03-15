import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import type { RestRoute } from '../../core/types.ts';

export const listRestRoutes: RestRoute[] = [
  {
    method: 'GET',
    pattern: /^\/api\/filesystem\/folders$/,
    async handler(req) {
      const url = new URL(req.url);
      const cwd = url.searchParams.get('cwd') || homedir();
      const withHidden = url.searchParams.get('with_hidden') === 'true';

      let dirents;
      try {
        dirents = await readdir(cwd, { withFileTypes: true });
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          return Response.json(
            { error: 'Directory not found' },
            { status: 400 },
          );
        }
        if (code === 'ENOTDIR') {
          return Response.json(
            { error: 'Path is not a directory' },
            { status: 400 },
          );
        }
        if (code === 'EACCES') {
          return Response.json(
            { error: 'Permission denied' },
            { status: 400 },
          );
        }
        return Response.json(
          { error: 'Failed to read directory' },
          { status: 400 },
        );
      }

      const entries: string[] = [];

      for (const dirent of dirents) {
        if (!withHidden && dirent.name.startsWith('.')) continue;
        if (!dirent.isDirectory()) continue;
        entries.push(dirent.name);
      }

      entries.sort((a, b) => a.localeCompare(b));

      return Response.json({ cwd, entries });
    },
  },
];
