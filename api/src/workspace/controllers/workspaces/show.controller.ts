import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { WorkspacesService } from '../../services';

@ApiTags('workspaces')
@Controller('/api/workspaces')
export class ShowController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a workspace by ID' })
  async invoke(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }
}
