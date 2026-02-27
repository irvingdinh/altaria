import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { WorkspacesService } from '../../services';

@ApiTags('workspaces')
@Controller('/api/workspaces')
export class IndexController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List all workspaces' })
  async invoke() {
    return this.workspacesService.findAll();
  }
}
