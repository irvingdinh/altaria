import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';

const uiPath = join(__dirname, '..', '..', 'ui');

export const serveStaticModule = existsSync(uiPath)
  ? ServeStaticModule.forRoot({
      rootPath: uiPath,
      exclude: ['/api/{*path}', '/ws/{*path}', '/swagger/{*path}'],
    })
  : null;
