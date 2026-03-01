import { ScrollArea } from "@/components/ui/scroll-area";

import { useGitStatus } from "../../hooks";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  M: { label: "Modified", className: "text-yellow-500" },
  A: { label: "Added", className: "text-green-500" },
  D: { label: "Deleted", className: "text-red-500" },
  R: { label: "Renamed", className: "text-blue-500" },
  C: { label: "Copied", className: "text-blue-500" },
  "??": { label: "Untracked", className: "text-muted-foreground" },
};

function getStatusInfo(status: string) {
  return (
    STATUS_MAP[status] ?? { label: status, className: "text-muted-foreground" }
  );
}

interface GitChangedFilesProps {
  cwd: string;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

export function GitChangedFiles({
  cwd,
  selectedFile,
  onFileSelect,
}: GitChangedFilesProps) {
  const { data, isLoading } = useGitStatus(cwd);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!data || data.files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">No changes detected</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-1">
        {data.files.map((file) => {
          const info = getStatusInfo(file.status);
          const isSelected = selectedFile === file.path;

          return (
            <button
              key={file.path}
              type="button"
              className={`hover:bg-accent flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm ${
                isSelected ? "bg-accent" : ""
              }`}
              onClick={() => onFileSelect(file.path)}
            >
              <span
                className={`shrink-0 text-xs font-medium ${info.className}`}
              >
                {info.label}
              </span>
              <span className="truncate">{file.path}</span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
