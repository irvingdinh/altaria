import {
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PtyHostService } from '../../services/pty-host.service';

@ApiTags('sessions')
@Controller('/api/sessions')
export class DetachController {
  constructor(private readonly ptyService: PtyHostService) {}

  @Post(':sessionId/detach')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Detach from a session (keeps it running)' })
  async detach(@Param('sessionId') sessionId: string) {
    const session = await this.ptyService.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    await this.ptyService.detach(sessionId);
  }

  @Post(':sessionId/attach')
  @ApiOperation({ summary: 'Reattach to a detached session' })
  async attach(@Param('sessionId') sessionId: string) {
    const session = await this.ptyService.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const buffer = await this.ptyService.reattach(sessionId);
    return {
      id: session.id,
      workspaceId: session.workspaceId,
      agentType: session.agentType,
      cwd: session.cwd,
      buffer,
    };
  }
}
