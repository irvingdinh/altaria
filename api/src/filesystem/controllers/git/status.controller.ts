import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { GitStatusQueryDto } from '../../dtos';
import { FilesystemService } from '../../services';

@ApiTags('filesystem')
@Controller('/api/filesystem/git/status')
export class StatusController {
  constructor(private readonly filesystemService: FilesystemService) {}

  @Get()
  @ApiOperation({ summary: 'Get git status' })
  invoke(@Query() query: GitStatusQueryDto) {
    return this.filesystemService.gitStatus(query.cwd);
  }
}
