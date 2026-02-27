import { NestApplication } from '@nestjs/core';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { createTestApp, destroyTestApp, withUrl } from './utils';

interface DirectoryEntry {
  name: string;
  path: string;
}

describe('Filesystem Directory Listing', () => {
  let app: NestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(app);
  });

  it('should list home directory by default', async () => {
    const res = await fetch(withUrl('api', 'filesystem', 'directories'));
    expect(res.status).toBe(200);

    const body: DirectoryEntry[] = (await res.json()) as DirectoryEntry[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    for (const entry of body) {
      expect(entry.name).toBeDefined();
      expect(entry.path).toBeDefined();
      expect(entry.path).toContain(homedir());
    }
  });

  it('should list directories at a given path', async () => {
    const res = await fetch(
      withUrl('api', 'filesystem', 'directories') + '?path=/tmp',
    );
    expect(res.status).toBe(200);

    const body: DirectoryEntry[] = (await res.json()) as DirectoryEntry[];
    expect(Array.isArray(body)).toBe(true);
  });

  it('should return 400 for a non-existent path', async () => {
    const res = await fetch(
      withUrl('api', 'filesystem', 'directories') +
        '?path=/nonexistent-path-xyz-123',
    );
    expect(res.status).toBe(400);
  });

  it('should only return directories, not files', async () => {
    const testDir = join('/tmp', `altaria-fs-test-${Date.now()}`);
    mkdirSync(join(testDir, 'subdir'), { recursive: true });
    writeFileSync(join(testDir, 'file.txt'), 'hello');

    try {
      const res = await fetch(
        withUrl('api', 'filesystem', 'directories') +
          `?path=${encodeURIComponent(testDir)}`,
      );
      expect(res.status).toBe(200);

      const body: DirectoryEntry[] = (await res.json()) as DirectoryEntry[];
      expect(body).toEqual([{ name: 'subdir', path: join(testDir, 'subdir') }]);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return results sorted by name', async () => {
    const testDir = join('/tmp', `altaria-fs-sort-${Date.now()}`);
    mkdirSync(join(testDir, 'charlie'), { recursive: true });
    mkdirSync(join(testDir, 'alpha'), { recursive: true });
    mkdirSync(join(testDir, 'bravo'), { recursive: true });

    try {
      const res = await fetch(
        withUrl('api', 'filesystem', 'directories') +
          `?path=${encodeURIComponent(testDir)}`,
      );
      expect(res.status).toBe(200);

      const body: DirectoryEntry[] = (await res.json()) as DirectoryEntry[];
      const names = body.map((e) => e.name);
      expect(names).toEqual(['alpha', 'bravo', 'charlie']);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
