import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SettingsService } from '../../services';

@ApiTags('settings')
@Controller('/api/settings')
export class DestroyController {
  constructor(private readonly settingsService: SettingsService) {}

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a setting by key' })
  async invoke(@Param('key') key: string) {
    await this.settingsService.remove(key);
  }
}
