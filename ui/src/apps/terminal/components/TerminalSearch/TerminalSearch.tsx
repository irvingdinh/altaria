import type { SearchAddon } from "@xterm/addon-search";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface TerminalSearchProps {
  searchAddonRef: RefObject<SearchAddon | null>;
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalSearch({
  searchAddonRef,
  isOpen,
  onClose,
}: TerminalSearchProps) {
  const [query, setQuery] = useState("");
  const [hasMatches, setHasMatches] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      searchAddonRef.current?.clearDecorations();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, searchAddonRef]);

  const doSearch = useCallback(
    (direction: "next" | "prev") => {
      const searchAddon = searchAddonRef.current;
      if (!searchAddon || !query) return;

      const result =
        direction === "next"
          ? searchAddon.findNext(query, {
              decorations: {
                activeMatchColorOverviewRuler: "#fbbf24",
                matchOverviewRuler: "#888888",
              },
            })
          : searchAddon.findPrevious(query, {
              decorations: {
                activeMatchColorOverviewRuler: "#fbbf24",
                matchOverviewRuler: "#888888",
              },
            });

      setHasMatches(result);
    },
    [searchAddonRef, query],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch(e.shiftKey ? "prev" : "next");
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    const searchAddon = searchAddonRef.current;
    if (searchAddon && value) {
      const result = searchAddon.findNext(value, {
        decorations: {
          activeMatchColorOverviewRuler: "#fbbf24",
          matchOverviewRuler: "#888888",
        },
        incremental: true,
      });
      setHasMatches(result);
    } else {
      searchAddonRef.current?.clearDecorations();
      setHasMatches(null);
    }
  };

  const handleClose = () => {
    setQuery("");
    setHasMatches(null);
    searchAddonRef.current?.clearDecorations();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 p-1 shadow-lg">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find..."
        className="w-48 rounded border-none bg-neutral-800 px-2 py-1 text-sm text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-neutral-600"
      />

      {hasMatches !== null && (
        <span className="px-1 text-xs text-neutral-500">
          {hasMatches ? "Found" : "No matches"}
        </span>
      )}

      <button
        type="button"
        onClick={() => doSearch("prev")}
        disabled={!query}
        className="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-50"
        aria-label="Previous match"
      >
        <ChevronUp size={16} />
      </button>

      <button
        type="button"
        onClick={() => doSearch("next")}
        disabled={!query}
        className="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-50"
        aria-label="Next match"
      >
        <ChevronDown size={16} />
      </button>

      <button
        type="button"
        onClick={handleClose}
        className="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-white"
        aria-label="Close search"
      >
        <X size={16} />
      </button>
    </div>
  );
}
