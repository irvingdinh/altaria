import "@xterm/xterm/css/xterm.css";

import { useEffect, useMemo, useRef } from "react";

import { resolveTheme } from "@/apps/terminal/components/Terminal/theme.ts";
import { TerminalAccessoryBar } from "@/apps/terminal/components/TerminalAccessoryBar";
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

  const isTouchOnly = useMemo(
    () => window.matchMedia("(hover: none)").matches,
    [],
  );

  const { terminalRef, sendInputRef, ctrlActiveRef, shiftActiveRef } =
    useTerminalSession(
      containerRef,
      resolveTheme(theme),
      sessionId,
      onSessionExit,
      ctrlConsumedRef,
      shiftConsumedRef,
    );

  // Theme sync
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = resolveTheme(theme);
    }
  }, [theme, terminalRef]);

  // System theme media query listener (only when theme === "system")
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
          sendInputRef={sendInputRef}
          ctrlActiveRef={ctrlActiveRef}
          ctrlConsumedRef={ctrlConsumedRef}
          shiftActiveRef={shiftActiveRef}
          shiftConsumedRef={shiftConsumedRef}
        />
      )}
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 z-10 overflow-hidden",
          isTouchOnly && "bottom-10",
        )}
      />
    </>
  );
};
