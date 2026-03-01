import { ChevronRight, File, Folder } from "lucide-react";
import { useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

import { useEntries } from "../../hooks";
import type { FileEntry } from "../../types";

interface FileTreeProps {
  rootPath: string;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

export function FileTree({
  rootPath,
  selectedFile,
  onFileSelect,
}: FileTreeProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-1">
        <FileTreeNode
          path={rootPath}
          depth={0}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
        />
      </div>
    </ScrollArea>
  );
}

interface FileTreeNodeProps {
  path: string;
  depth: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

function FileTreeNode({
  path,
  depth,
  selectedFile,
  onFileSelect,
}: FileTreeNodeProps) {
  const { data: entries, isLoading } = useEntries(path);

  if (isLoading) {
    return (
      <div
        className="text-muted-foreground py-1 text-sm"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        Loading...
      </div>
    );
  }

  return (
    <>
      {entries?.map((entry) => (
        <FileTreeRow
          key={entry.path}
          entry={entry}
          depth={depth}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
        />
      ))}
    </>
  );
}

interface FileTreeRowProps {
  entry: FileEntry;
  depth: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

function FileTreeRow({
  entry,
  depth,
  selectedFile,
  onFileSelect,
}: FileTreeRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isDirectory = entry.type === "directory";
  const isSelected = selectedFile === entry.path;

  return (
    <>
      <button
        type="button"
        className={`hover:bg-accent flex w-full items-center gap-1 rounded-sm px-2 py-1 text-sm ${
          isSelected ? "bg-accent" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (isDirectory) {
            setExpanded(!expanded);
          } else {
            onFileSelect(entry.path);
          }
        }}
      >
        {isDirectory ? (
          <ChevronRight
            className={`size-3.5 shrink-0 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        {isDirectory ? (
          <Folder className="size-3.5 shrink-0" />
        ) : (
          <File className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{entry.name}</span>
      </button>
      {isDirectory && expanded && (
        <FileTreeNode
          path={entry.path}
          depth={depth + 1}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
        />
      )}
    </>
  );
}
