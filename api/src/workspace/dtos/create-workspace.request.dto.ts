import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWorkspaceRequestDto {
  @ApiProperty({ description: 'Workspace name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Working directory path' })
  @IsString()
  @IsNotEmpty()
  directory: string;
}
