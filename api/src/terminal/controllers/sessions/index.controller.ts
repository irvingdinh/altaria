import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PtyHostService } from '../../services/pty-host.service';

@ApiTags('sessions')
@Controller('/api/workspaces/:workspaceId/sessions')
export class IndexController {
  constructor(private readonly ptyService: PtyHostService) {}

  @Get()
  @ApiOperation({ summary: 'List sessions for a workspace' })
  async invoke(@Param('workspaceId') workspaceId: string) {
    const sessions = await this.ptyService.findByWorkspaceId(workspaceId);
    return sessions.map((s) => ({
      id: s.id,
      workspaceId: s.workspaceId,
      agentType: s.agentType,
      cwd: s.cwd,
    }));
  }
}
