import "@xterm/xterm/css/xterm.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveTheme } from "@/apps/terminal/components/Terminal/theme.ts";
import { TerminalAccessoryBar } from "@/apps/terminal/components/TerminalAccessoryBar";
import { TerminalSearch } from "@/apps/terminal/components/TerminalSearch/TerminalSearch";
import { useTerminalSession } from "@/apps/terminal/hooks/use-terminal-session.ts";
import { useTheme } from "@/components/theme-provider.tsx";
import { cn } from "@/lib/utils.ts";

interface TerminalProps {
  sessionId: string;
  onSessionExit?: () => void;
}

export const Terminal = ({ sessionId, onSessionExit }: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctrlConsumedRef = useRef<(() => void) | null>(null);
  const shiftConsumedRef = useRef<(() => void) | null>(null);
  const { theme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const isTouchOnly = useMemo(
    () => window.matchMedia("(hover: none)").matches,
    [],
  );

  const {
    terminalRef,
    sendInputRef,
    ctrlActiveRef,
    shiftActiveRef,
    searchAddonRef,
  } = useTerminalSession(
    containerRef,
    resolveTheme(theme),
    sessionId,
    onSessionExit,
    ctrlConsumedRef,
    shiftConsumedRef,
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = resolveTheme(theme);
    }
  }, [theme, terminalRef]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (terminalRef.current) {
        terminalRef.current.options.theme = resolveTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme, terminalRef]);

  return (
    <>
      {isTouchOnly && (
        <TerminalAccessoryBar
          terminalRef={terminalRef}
          sendInputRef={sendInputRef}
          ctrlActiveRef={ctrlActiveRef}
          ctrlConsumedRef={ctrlConsumedRef}
          shiftActiveRef={shiftActiveRef}
          shiftConsumedRef={shiftConsumedRef}
        />
      )}
      <div className="relative h-full w-full">
        <TerminalSearch
          searchAddonRef={searchAddonRef}
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
        <div
          ref={containerRef}
          className={cn(
            "absolute inset-0 z-10 overflow-hidden",
            isTouchOnly && "bottom-10",
          )}
        />
      </div>
    </>
  );
};
