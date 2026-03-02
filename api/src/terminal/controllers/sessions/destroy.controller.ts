import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PtyHostService } from '../../services/pty-host.service';

@ApiTags('sessions')
@Controller('/api/workspaces/:workspaceId/sessions')
export class DestroyController {
  constructor(private readonly ptyService: PtyHostService) {}

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Destroy a session' })
  async invoke(@Param('sessionId') sessionId: string) {
    const session = await this.ptyService.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    await this.ptyService.destroy(session.id);
  }
}
