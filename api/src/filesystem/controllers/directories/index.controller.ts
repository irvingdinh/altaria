import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ListDirectoriesQueryDto } from '../../dtos';
import { FilesystemService } from '../../services';

@ApiTags('filesystem')
@Controller('/api/filesystem/directories')
export class IndexController {
  constructor(private readonly filesystemService: FilesystemService) {}

  @Get()
  @ApiOperation({ summary: 'List directories at a given path' })
  invoke(@Query() query: ListDirectoriesQueryDto) {
    return this.filesystemService.listDirectories(query.path);
  }
}
