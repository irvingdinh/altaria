import { Module } from '@nestjs/common';

import { gateways } from './gateways';
import { services } from './services';

@Module({
  providers: [...gateways, ...services],
})
export class TerminalModule {}
