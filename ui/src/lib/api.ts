export interface SessionInfo {
  id: string;
  createdAt: number;
  clientCount: number;
}

export async function listSessions(): Promise<SessionInfo[]> {
  const res = await fetch('/api/sessions');
  return res.json();
}

export async function createSession(): Promise<SessionInfo> {
  const res = await fetch('/api/sessions', { method: 'POST' });
  return res.json();
}

export async function deleteSession(id: string): Promise<boolean> {
  const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  return res.status === 204;
}
