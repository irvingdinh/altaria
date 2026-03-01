import { BadRequestException, Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import { readdirSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

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

  listEntries(
    basePath?: string,
  ): { name: string; path: string; type: 'file' | 'directory' }[] {
    const dirPath = basePath || homedir();

    try {
      const rawEntries = readdirSync(dirPath, { withFileTypes: true });
      const entries: {
        name: string;
        path: string;
        type: 'file' | 'directory';
      }[] = rawEntries
        .filter((entry) => entry.isFile() || entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          path: join(dirPath, entry.name),
          type: entry.isDirectory() ? 'directory' : 'file',
        }));
      return entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } catch {
      throw new BadRequestException(`Unable to read directory: ${dirPath}`);
    }
  }

  readFile(filePath: string): { path: string; content: string; size: number } {
    try {
      const stat = statSync(filePath);
      if (!stat.isFile()) {
        throw new BadRequestException(`Not a file: ${filePath}`);
      }
      if (stat.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File too large: ${stat.size} bytes (max ${MAX_FILE_SIZE})`,
        );
      }
      const content = readFileSync(filePath, 'utf-8');
      return { path: filePath, content, size: stat.size };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Unable to read file: ${filePath}`);
    }
  }

  gitStatus(cwd: string): { files: { path: string; status: string }[] } {
    try {
      const output = execSync('git status --porcelain', {
        cwd,
        encoding: 'utf-8',
      });
      const files = output
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => ({
          status: line.substring(0, 2).trim(),
          path: line.substring(3),
        }));
      return { files };
    } catch {
      throw new BadRequestException(`Unable to get git status in: ${cwd}`);
    }
  }

  gitDiff(cwd: string, filePath?: string): { diff: string } {
    try {
      const cmd = filePath ? `git diff -- ${filePath}` : 'git diff';
      const output = execSync(cmd, { cwd, encoding: 'utf-8' });
      return { diff: output };
    } catch {
      throw new BadRequestException(`Unable to get git diff in: ${cwd}`);
    }
  }
}
