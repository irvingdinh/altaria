import { Module } from '@nestjs/common';

import { CoreModule } from './core/core.module';
import { HealthModule } from './health/health.module';
import { SettingModule } from './setting/setting.module';

@Module({
  imports: [CoreModule, HealthModule, SettingModule],
})
export class AppModule {}
