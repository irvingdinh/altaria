import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ListEntriesQueryDto } from '../../dtos';
import { FilesystemService } from '../../services';

@ApiTags('filesystem')
@Controller('/api/filesystem/entries')
export class IndexController {
  constructor(private readonly filesystemService: FilesystemService) {}

  @Get()
  @ApiOperation({
    summary: 'List entries (files and directories) at a given path',
  })
  invoke(@Query() query: ListEntriesQueryDto) {
    return this.filesystemService.listEntries(query.path);
  }
}
