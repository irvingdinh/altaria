import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReadFileQueryDto {
  @ApiProperty({ description: 'File path to read' })
  @IsString()
  @IsNotEmpty()
  path: string;
}
