import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListEntriesQueryDto {
  @ApiPropertyOptional({
    description: 'Directory path to list (defaults to home directory)',
  })
  @IsString()
  @IsOptional()
  path?: string;
}
