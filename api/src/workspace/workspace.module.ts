import { Module } from '@nestjs/common';

import { CoreModule } from '../core/core.module';
import { controllers } from './controllers';
import { services } from './services';

@Module({
  imports: [CoreModule],
  controllers: [...controllers],
  providers: [...services],
  exports: [...services],
})
export class WorkspaceModule {}
