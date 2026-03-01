import { useQuery } from "@tanstack/react-query";

import type { GitDiffResponse } from "../types";

export function useGitDiff(cwd: string | undefined, file?: string | null) {
  return useQuery<GitDiffResponse>({
    queryKey: ["git-diff", cwd, file ?? "all"],
    queryFn: async () => {
      let url = `/api/filesystem/git/diff?cwd=${encodeURIComponent(cwd!)}`;
      if (file) url += `&file=${encodeURIComponent(file)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch git diff");
      return res.json();
    },
    enabled: !!cwd,
  });
}
