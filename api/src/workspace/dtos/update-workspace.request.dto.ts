import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceRequestDto {
  @ApiPropertyOptional({ description: 'Workspace name' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Working directory path' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  directory?: string;
}
