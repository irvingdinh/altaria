import { NestApplication } from '@nestjs/core';

import { createTestApp, destroyTestApp, withUrl } from './utils';

interface Workspace {
  id: string;
  name: string;
  directory: string;
  createdAt: string;
  updatedAt: string;
}

async function createWorkspace(
  name: string,
  directory: string,
): Promise<Response> {
  return fetch(withUrl('api', 'workspaces'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, directory }),
  });
}

describe('Workspace CRUD', () => {
  let app: NestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(app);
  });

  it('should create a workspace with a valid directory', async () => {
    const res = await createWorkspace('test-ws', '/tmp');
    expect(res.status).toBe(201);

    const body: Workspace = (await res.json()) as Workspace;
    expect(body.id).toBeDefined();
    expect(body.name).toBe('test-ws');
    expect(body.directory).toBe('/tmp');
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('should reject creation with a non-existent directory', async () => {
    const res = await createWorkspace('bad-ws', '/nonexistent-path-xyz-123');
    expect(res.status).toBe(400);
  });

  it('should reject creation with missing fields', async () => {
    const res = await fetch(withUrl('api', 'workspaces'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should list all workspaces', async () => {
    await createWorkspace('second-ws', '/tmp');

    const res = await fetch(withUrl('api', 'workspaces'));
    expect(res.status).toBe(200);

    const body: Workspace[] = (await res.json()) as Workspace[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2);
  });

  it('should list workspaces ordered by createdAt DESC', async () => {
    const res = await fetch(withUrl('api', 'workspaces'));
    const body: Workspace[] = (await res.json()) as Workspace[];

    for (let i = 1; i < body.length; i++) {
      const prev = new Date(body[i - 1].createdAt).getTime();
      const curr = new Date(body[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('should get a workspace by ID', async () => {
    const createRes = await createWorkspace('get-by-id', '/tmp');
    const created: Workspace = (await createRes.json()) as Workspace;

    const res = await fetch(withUrl('api', 'workspaces', created.id));
    expect(res.status).toBe(200);

    const body: Workspace = (await res.json()) as Workspace;
    expect(body.id).toBe(created.id);
    expect(body.name).toBe('get-by-id');
  });

  it('should return 404 for a non-existent workspace', async () => {
    const res = await fetch(withUrl('api', 'workspaces', 'nonexistent-id'));
    expect(res.status).toBe(404);
  });

  it('should update a workspace name', async () => {
    const createRes = await createWorkspace('before-update', '/tmp');
    const created: Workspace = (await createRes.json()) as Workspace;

    const res = await fetch(withUrl('api', 'workspaces', created.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'after-update' }),
    });
    expect(res.status).toBe(200);

    const body: Workspace = (await res.json()) as Workspace;
    expect(body.name).toBe('after-update');
    expect(body.directory).toBe('/tmp');
  });

  it('should reject update with a non-existent directory', async () => {
    const createRes = await createWorkspace('update-bad-dir', '/tmp');
    const created: Workspace = (await createRes.json()) as Workspace;

    const res = await fetch(withUrl('api', 'workspaces', created.id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory: '/nonexistent-path-xyz-123' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 404 when updating a non-existent workspace', async () => {
    const res = await fetch(withUrl('api', 'workspaces', 'nonexistent-id'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('should delete a workspace', async () => {
    const createRes = await createWorkspace('to-delete', '/tmp');
    const created: Workspace = (await createRes.json()) as Workspace;

    const res = await fetch(withUrl('api', 'workspaces', created.id), {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);

    // Verify it's gone
    const getRes = await fetch(withUrl('api', 'workspaces', created.id));
    expect(getRes.status).toBe(404);
  });

  it('should return 404 when deleting a non-existent workspace', async () => {
    const res = await fetch(withUrl('api', 'workspaces', 'nonexistent-id'), {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});
