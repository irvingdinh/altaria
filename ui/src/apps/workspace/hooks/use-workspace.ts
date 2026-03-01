import { useQuery } from "@tanstack/react-query";

import type { Workspace } from "../types";

export function useWorkspace(id: string | undefined) {
  return useQuery<Workspace>({
    queryKey: ["workspaces", id],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${id}`);
      if (!res.ok) throw new Error("Failed to fetch workspace");
      return res.json();
    },
    enabled: !!id,
  });
}
