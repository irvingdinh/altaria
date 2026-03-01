import { ScrollArea } from "@/components/ui/scroll-area";

import { useGitDiff } from "../../hooks";

interface DiffViewerProps {
  cwd: string;
  filePath: string | null;
}

export function DiffViewer({ cwd, filePath }: DiffViewerProps) {
  const { data, isLoading } = useGitDiff(cwd, filePath);

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Select a file to view its diff
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!data || !data.diff) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">No diff available</p>
      </div>
    );
  }

  const lines = data.diff.split("\n");

  return (
    <ScrollArea className="h-full">
      <pre className="p-4 text-sm">
        <code>
          {lines.map((line, i) => {
            let className = "";
            if (line.startsWith("+") && !line.startsWith("+++")) {
              className = "bg-green-500/15";
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              className = "bg-red-500/15";
            } else if (line.startsWith("@@")) {
              className = "bg-blue-500/15";
            }

            return (
              <div key={i} className={className}>
                {line}
              </div>
            );
          })}
        </code>
      </pre>
    </ScrollArea>
  );
}
