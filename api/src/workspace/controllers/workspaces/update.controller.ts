import { Body, Controller, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { UpdateWorkspaceRequestDto } from '../../dtos';
import { WorkspacesService } from '../../services';

@ApiTags('workspaces')
@Controller('/api/workspaces')
export class UpdateController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Put(':id')
  @ApiOperation({ summary: 'Update a workspace' })
  async invoke(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceRequestDto,
  ) {
    return this.workspacesService.update(id, dto);
  }
}
