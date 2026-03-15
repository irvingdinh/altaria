import { useCallback, useEffect, useState } from "react";

interface Session {
  id: string;
  cwd: string | null;
  createdAt: number;
  clientCount: number;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as Session[];
      setSessions(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      // Silently ignore fetch errors (backend may be down)
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { sessions, refresh };
}
