import { useQuery } from "@tanstack/react-query";

import type { GitStatusResponse } from "../types";

export function useGitStatus(cwd: string | undefined) {
  return useQuery<GitStatusResponse>({
    queryKey: ["git-status", cwd],
    queryFn: async () => {
      const res = await fetch(
        `/api/filesystem/git/status?cwd=${encodeURIComponent(cwd!)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch git status");
      return res.json();
    },
    enabled: !!cwd,
  });
}
