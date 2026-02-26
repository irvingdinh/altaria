import { Body, Controller, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { UpsertSettingRequestDto } from '../../dtos';
import { SettingsService } from '../../services';

@ApiTags('settings')
@Controller('/api/settings')
export class UpsertController {
  constructor(private readonly settingsService: SettingsService) {}

  @Put()
  @ApiOperation({ summary: 'Create or update a setting' })
  async invoke(@Body() dto: UpsertSettingRequestDto) {
    return this.settingsService.upsert(dto);
  }
}
