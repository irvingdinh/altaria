import type { ModuleRoutes } from '../core/types.ts';
import { listRestRoutes } from './routes/list.route.ts';

export function filesystemModule(): ModuleRoutes {
  return {
    rest: listRestRoutes,
  };
}
