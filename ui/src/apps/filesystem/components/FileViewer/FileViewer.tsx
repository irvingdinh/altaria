import { ScrollArea } from "@/components/ui/scroll-area";

import { useFileContent } from "../../hooks";

interface FileViewerProps {
  filePath: string | null;
}

export function FileViewer({ filePath }: FileViewerProps) {
  const { data, isLoading } = useFileContent(filePath);

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Select a file to view its contents
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

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Unable to load file</p>
      </div>
    );
  }

  const lines = data.content.split("\n");

  return (
    <ScrollArea className="h-full">
      <pre className="p-4 text-sm">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="text-muted-foreground mr-4 inline-block w-8 text-right select-none">
                {i + 1}
              </span>
              <span>{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </ScrollArea>
  );
}
