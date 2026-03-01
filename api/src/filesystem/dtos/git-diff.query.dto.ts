import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GitDiffQueryDto {
  @ApiProperty({ description: 'Working directory for git diff' })
  @IsString()
  @IsNotEmpty()
  cwd: string;

  @ApiPropertyOptional({ description: 'Specific file path to diff' })
  @IsString()
  @IsOptional()
  file?: string;
}
