import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GitStatusQueryDto {
  @ApiProperty({ description: 'Working directory for git status' })
  @IsString()
  @IsNotEmpty()
  cwd: string;
}
