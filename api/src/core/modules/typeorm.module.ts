import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

import { entities } from '../entities';
import { DirectoryService } from '../services';

export const typeormForRoot = TypeOrmModule.forRootAsync({
  extraProviders: [DirectoryService],
  useFactory: (directoryService: DirectoryService): TypeOrmModuleOptions => {
    return {
      type: 'better-sqlite3',
      database: directoryService.databasePath(),
      entities: [...entities],
      synchronize: true,
    };
  },
  inject: [DirectoryService],
});

export const typeormForFeature = TypeOrmModule.forFeature([...entities]);
