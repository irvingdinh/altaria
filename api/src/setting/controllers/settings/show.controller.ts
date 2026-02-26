import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SettingsService } from '../../services';

@ApiTags('settings')
@Controller('/api/settings')
export class ShowController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':key')
  @ApiOperation({ summary: 'Get a setting by key' })
  async invoke(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }
}
