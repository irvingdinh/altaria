import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Session } from "../types";

export const sessionsKey = (workspaceId: string) => [
  "workspaces",
  workspaceId,
  "sessions",
];

export function useSessions(workspaceId: string) {
  return useQuery<Session[]>({
    queryKey: sessionsKey(workspaceId),
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/sessions`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    refetchInterval: 5000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/sessions`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create session");
      return res.json() as Promise<Session>;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({
        queryKey: sessionsKey(session.workspaceId),
      });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      sessionId,
    }: {
      workspaceId: string;
      sessionId: string;
    }) => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/sessions/${sessionId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete session");
      return { workspaceId };
    },
    onSuccess: ({ workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: sessionsKey(workspaceId),
      });
    },
  });
}
