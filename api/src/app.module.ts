import { MiddlewareConsumer, Module } from '@nestjs/common';

import { CoreModule } from './core/core.module';
import { SpaMiddleware } from './core/middlewares/spa-middleware.service';
import { FilesystemModule } from './filesystem/filesystem.module';
import { HealthModule } from './health/health.module';
import { SettingModule } from './setting/setting.module';
import { TerminalModule } from './terminal/terminal.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    CoreModule,
    FilesystemModule,
    HealthModule,
    SettingModule,
    TerminalModule,
    WorkspaceModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SpaMiddleware).forRoutes('*');
  }
}
