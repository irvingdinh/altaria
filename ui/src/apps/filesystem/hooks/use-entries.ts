import { useQuery } from "@tanstack/react-query";

import type { FileEntry } from "../types";

export function useEntries(path?: string) {
  return useQuery<FileEntry[]>({
    queryKey: ["entries", path ?? "~"],
    queryFn: async () => {
      const url = path
        ? `/api/filesystem/entries?path=${encodeURIComponent(path)}`
        : "/api/filesystem/entries";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch entries");
      return res.json();
    },
  });
}
