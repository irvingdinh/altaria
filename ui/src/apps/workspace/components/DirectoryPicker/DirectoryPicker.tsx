import { ChevronRight, Folder } from "lucide-react";
import { useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

import { useDirectories } from "../../hooks";
import type { DirectoryEntry } from "../../types";

interface DirectoryPickerProps {
  value: string;
  onChange: (path: string) => void;
}

export function DirectoryPicker({ value, onChange }: DirectoryPickerProps) {
  return (
    <ScrollArea className="h-48 rounded-md border">
      <div className="p-1">
        <DirectoryNode
          path={undefined}
          depth={0}
          value={value}
          onChange={onChange}
        />
      </div>
    </ScrollArea>
  );
}

interface DirectoryNodeProps {
  path: string | undefined;
  depth: number;
  value: string;
  onChange: (path: string) => void;
}

function DirectoryNode({ path, depth, value, onChange }: DirectoryNodeProps) {
  const { data: entries, isLoading } = useDirectories(path);

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
        <DirectoryRow
          key={entry.path}
          entry={entry}
          depth={depth}
          value={value}
          onChange={onChange}
        />
      ))}
    </>
  );
}

interface DirectoryRowProps {
  entry: DirectoryEntry;
  depth: number;
  value: string;
  onChange: (path: string) => void;
}

function DirectoryRow({ entry, depth, value, onChange }: DirectoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = value === entry.path;

  return (
    <>
      <button
        type="button"
        className={`hover:bg-accent flex w-full items-center gap-1 rounded-sm px-2 py-1 text-sm ${
          isSelected ? "bg-accent" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onChange(entry.path)}
      >
        <ChevronRight
          className={`size-3.5 shrink-0 cursor-pointer transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        />
        <Folder className="size-3.5 shrink-0" />
        <span className="truncate">{entry.name}</span>
      </button>
      {expanded && (
        <DirectoryNode
          path={entry.path}
          depth={depth + 1}
          value={value}
          onChange={onChange}
        />
      )}
    </>
  );
}
