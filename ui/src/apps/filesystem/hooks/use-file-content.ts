import { useQuery } from "@tanstack/react-query";

import type { FileContent } from "../types";

export function useFileContent(path: string | null) {
  return useQuery<FileContent>({
    queryKey: ["file-content", path],
    queryFn: async () => {
      const res = await fetch(
        `/api/filesystem/files?path=${encodeURIComponent(path!)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch file content");
      return res.json();
    },
    enabled: !!path,
  });
}
