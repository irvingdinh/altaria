import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateWorkspaceRequestDto } from '../../dtos';
import { WorkspacesService } from '../../services';

@ApiTags('workspaces')
@Controller('/api/workspaces')
export class CreateController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  async invoke(@Body() dto: CreateWorkspaceRequestDto) {
    return this.workspacesService.create(dto);
  }
}
