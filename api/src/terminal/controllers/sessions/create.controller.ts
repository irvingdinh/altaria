import { Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { WorkspacesService } from '../../../workspace/services/workspaces.service';
import { PtyService } from '../../services/pty.service';

@ApiTags('sessions')
@Controller('/api/workspaces/:workspaceId/sessions')
export class CreateController {
  constructor(
    private readonly ptyService: PtyService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a session for a workspace' })
  async invoke(@Param('workspaceId') workspaceId: string) {
    const workspace = await this.workspacesService.findOne(workspaceId);
    const session = this.ptyService.create(
      workspaceId,
      workspace.directory,
      80,
      24,
    );

    return {
      id: session.id,
      workspaceId: session.workspaceId,
      cwd: session.cwd,
    };
  }
}
