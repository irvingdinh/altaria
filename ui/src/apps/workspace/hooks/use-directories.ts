import { useQuery } from "@tanstack/react-query";

import type { DirectoryEntry } from "../types";

export function useDirectories(path?: string) {
  return useQuery<DirectoryEntry[]>({
    queryKey: ["directories", path ?? "~"],
    queryFn: async () => {
      const url = path
        ? `/api/filesystem/directories?path=${encodeURIComponent(path)}`
        : "/api/filesystem/directories";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch directories");
      return res.json();
    },
  });
}
