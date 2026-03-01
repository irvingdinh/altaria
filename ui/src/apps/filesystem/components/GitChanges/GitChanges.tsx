import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

import { DiffViewer } from "../DiffViewer";
import { GitChangedFiles } from "../GitChangedFiles";

interface GitChangesProps {
  workspaceDirectory: string;
}

export function GitChanges({ workspaceDirectory }: GitChangesProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const handleReload = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["git-status", workspaceDirectory],
    });
    queryClient.invalidateQueries({
      queryKey: ["git-diff", workspaceDirectory],
    });
  }, [queryClient, workspaceDirectory]);

  if (isMobile) {
    if (selectedFile) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedFile(null)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <span className="min-w-0 flex-1 truncate text-sm">
              {selectedFile}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleReload}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <DiffViewer cwd={workspaceDirectory} filePath={selectedFile} />
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-end border-b px-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleReload}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <GitChangedFiles
            cwd={workspaceDirectory}
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex w-72 shrink-0 flex-col border-r">
        <div className="flex items-center justify-end border-b px-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleReload}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <GitChangedFiles
            cwd={workspaceDirectory}
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
          />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <DiffViewer cwd={workspaceDirectory} filePath={selectedFile} />
      </div>
    </div>
  );
}
