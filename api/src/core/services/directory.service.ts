import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

import type { AppConfig } from '../config/config';

@Injectable()
export class DirectoryService {
  private readonly config: AppConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<AppConfig>('root')!;
  }

  dataDir(...segments: string[]): string {
    return join(this.config.dir.data, ...segments);
  }

  databasePath(): string {
    return join(this.config.dir.data, 'altaria.db');
  }
}
