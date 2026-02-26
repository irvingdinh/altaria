import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SettingsService } from '../../services';

@ApiTags('settings')
@Controller('/api/settings')
export class IndexController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all settings' })
  async invoke() {
    return this.settingsService.findAll();
  }
}
