import { Module } from '@nestjs/common';

import { CoreModule } from '../core/core.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { controllers } from './controllers';
import { gateways } from './gateways';
import { services } from './services';

@Module({
  imports: [CoreModule, WorkspaceModule],
  controllers: [...controllers],
  providers: [...gateways, ...services],
  exports: [...services],
})
export class TerminalModule {}
