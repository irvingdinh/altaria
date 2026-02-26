import { Module } from '@nestjs/common';

import { modules } from './modules';
import { typeormForFeature } from './modules/typeorm.module';
import { services } from './services';

@Module({
  imports: [...modules],
  providers: [...services],
  exports: [...services, typeormForFeature],
})
export class CoreModule {}
