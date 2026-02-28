import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PtyService } from '../../services/pty.service';

@ApiTags('sessions')
@Controller('/api/workspaces/:workspaceId/sessions')
export class IndexController {
  constructor(private readonly ptyService: PtyService) {}

  @Get()
  @ApiOperation({ summary: 'List sessions for a workspace' })
  invoke(@Param('workspaceId') workspaceId: string) {
    return this.ptyService.findByWorkspaceId(workspaceId).map((s) => ({
      id: s.id,
      workspaceId: s.workspaceId,
      agentType: s.agentType,
      cwd: s.cwd,
    }));
  }
}
