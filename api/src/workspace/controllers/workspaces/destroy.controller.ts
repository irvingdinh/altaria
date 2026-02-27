import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { WorkspacesService } from '../../services';

@ApiTags('workspaces')
@Controller('/api/workspaces')
export class DestroyController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workspace' })
  async invoke(@Param('id') id: string) {
    await this.workspacesService.remove(id);
  }
}
