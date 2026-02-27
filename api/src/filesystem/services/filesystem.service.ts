import { BadRequestException, Injectable } from '@nestjs/common';
import { readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

@Injectable()
export class FilesystemService {
  listDirectories(basePath?: string): { name: string; path: string }[] {
    const dirPath = basePath || homedir();

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          path: join(dirPath, entry.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      throw new BadRequestException(`Unable to read directory: ${dirPath}`);
    }
  }
}
