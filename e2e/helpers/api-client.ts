import { API_BASE } from "../playwright.config";

interface Workspace {
  id: string;
  name: string;
  directory: string;
  createdAt: string;
  updatedAt: string;
}

interface Session {
  id: string;
  workspaceId: string;
  agentType: string;
  cwd: string;
}

export async function createWorkspaceViaApi(
  name: string,
  directory: string,
): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/api/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, directory }),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to create workspace: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

export async function deleteWorkspaceViaApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/workspaces/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(
      `Failed to delete workspace: ${res.status} ${await res.text()}`,
    );
  }
}

export async function listWorkspacesViaApi(): Promise<Workspace[]> {
  const res = await fetch(`${API_BASE}/api/workspaces`);
  if (!res.ok) {
    throw new Error(
      `Failed to list workspaces: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

export async function createSessionViaApi(
  workspaceId: string,
  agentType: string,
  args?: string[],
): Promise<Session> {
  const res = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentType, args }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Failed to create session: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

export async function deleteSessionViaApi(
  workspaceId: string,
  sessionId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/sessions/${sessionId}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(
      `Failed to delete session: ${res.status} ${await res.text()}`,
    );
  }
}

export async function cleanupAllWorkspaces(): Promise<void> {
  const workspaces = await listWorkspacesViaApi();
  for (const ws of workspaces) {
    await deleteWorkspaceViaApi(ws.id);
  }
}
