import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ReadFileQueryDto } from '../../dtos';
import { FilesystemService } from '../../services';

@ApiTags('filesystem')
@Controller('/api/filesystem/files')
export class ShowController {
  constructor(private readonly filesystemService: FilesystemService) {}

  @Get()
  @ApiOperation({ summary: 'Read file content' })
  invoke(@Query() query: ReadFileQueryDto) {
    return this.filesystemService.readFile(query.path);
  }
}
