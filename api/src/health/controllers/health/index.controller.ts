import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('/api/health')
export class IndexController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  invoke() {
    return { status: 'ok' };
  }
}
