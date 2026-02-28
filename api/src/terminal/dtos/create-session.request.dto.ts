import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

const AGENT_TYPES = ['native', 'claude', 'codex', 'gemini'] as const;

export class CreateSessionRequestDto {
  @ApiProperty({
    description: 'Agent type to spawn',
    enum: AGENT_TYPES,
    default: 'claude',
  })
  @IsIn(AGENT_TYPES)
  agentType: string = 'claude';

  @ApiPropertyOptional({
    description: 'Additional CLI arguments',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  args?: string[];
}
