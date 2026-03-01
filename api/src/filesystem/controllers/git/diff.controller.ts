import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { GitDiffQueryDto } from '../../dtos';
import { FilesystemService } from '../../services';

@ApiTags('filesystem')
@Controller('/api/filesystem/git/diff')
export class DiffController {
  constructor(private readonly filesystemService: FilesystemService) {}

  @Get()
  @ApiOperation({ summary: 'Get git diff' })
  invoke(@Query() query: GitDiffQueryDto) {
    return this.filesystemService.gitDiff(query.cwd, query.file);
  }
}
