import { Eye, EyeOff, Folder, FolderUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

interface FolderSelectorProps {
  onPathChange: (path: string) => void;
}

interface FetchState {
  resolvedPath: string;
  entries: string[];
  error: string | null;
  isLoading: boolean;
}

const initialState: FetchState = {
  resolvedPath: "",
  entries: [],
  error: null,
  isLoading: true,
};

function getFolderName(resolvedPath: string): string {
  if (!resolvedPath) return "~";
  if (resolvedPath === "/") return "/";
  const segments = resolvedPath.split("/");
  return segments[segments.length - 1] || "/";
}

export const FolderSelector = ({ onPathChange }: FolderSelectorProps) => {
  const [targetPath, setTargetPath] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>(initialState);
  const onPathChangeRef = useRef(onPathChange);

  useEffect(() => {
    onPathChangeRef.current = onPathChange;
  }, [onPathChange]);

  useEffect(() => {
    const ac = new AbortController();

    const params = new URLSearchParams();
    if (targetPath) params.set("cwd", targetPath);
    if (showHidden) params.set("with_hidden", "true");

    fetch(`/api/filesystem/folders?${params}`, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed: ${r.status}`);
        return r.json() as Promise<{ cwd: string; entries: string[] }>;
      })
      .then((data) => {
        setFetchState({
          resolvedPath: data.cwd,
          entries: data.entries,
          error: null,
          isLoading: false,
        });
        onPathChangeRef.current(data.cwd);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setFetchState((prev) => ({
            ...prev,
            error: err.message,
            isLoading: false,
          }));
        }
      });

    return () => ac.abort();
  }, [targetPath, showHidden]);

  const { resolvedPath, entries, error, isLoading } = fetchState;

  const isAtRoot = resolvedPath === "/";
  const folderName = getFolderName(resolvedPath);

  const navigateInto = (name: string) => {
    const next = resolvedPath === "/" ? `/${name}` : `${resolvedPath}/${name}`;
    setTargetPath(next);
    setFetchState((prev) => ({ ...prev, isLoading: true, error: null }));
  };

  const goToParent = () => {
    const parts = resolvedPath.split("/").slice(0, -1);
    setTargetPath(parts.join("/") || "/");
    setFetchState((prev) => ({ ...prev, isLoading: true, error: null }));
  };

  const toggleHidden = () => {
    setShowHidden((v) => !v);
    setFetchState((prev) => ({ ...prev, isLoading: true, error: null }));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header: [FolderUp] folderName [Eye] */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={goToParent}
          disabled={isAtRoot}
          className="text-muted-foreground shrink-0 p-1 disabled:opacity-40"
        >
          <FolderUp className="size-4" />
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
              {folderName}
            </span>
          </TooltipTrigger>
          <TooltipContent>{resolvedPath || "~"}</TooltipContent>
        </Tooltip>

        <button
          type="button"
          onClick={toggleHidden}
          className="text-muted-foreground shrink-0 p-1"
        >
          {showHidden ? (
            <Eye className="size-4" />
          ) : (
            <EyeOff className="size-4" />
          )}
        </button>
      </div>

      {/* Scrollable folder list */}
      <div className="no-scrollbar flex-1 overflow-y-auto pt-2">
        {error && (
          <p className="text-destructive py-2 text-center text-sm">{error}</p>
        )}

        <div className="space-y-0.5">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}

          {!isLoading && (
            <ScrollArea className="h-72 rounded-md border">
              {entries.map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => navigateInto(name)}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <Folder className="text-muted-foreground size-4" />
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};
