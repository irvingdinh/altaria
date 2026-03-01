import { ArrowLeft } from "lucide-react";
import { useState } from "react";

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
            <span className="truncate text-sm">{selectedFile}</span>
          </div>
          <div className="min-h-0 flex-1">
            <DiffViewer cwd={workspaceDirectory} filePath={selectedFile} />
          </div>
        </div>
      );
    }

    return (
      <div className="h-full">
        <GitChangedFiles
          cwd={workspaceDirectory}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 border-r">
        <GitChangedFiles
          cwd={workspaceDirectory}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />
      </div>
      <div className="min-w-0 flex-1">
        <DiffViewer cwd={workspaceDirectory} filePath={selectedFile} />
      </div>
    </div>
  );
}
