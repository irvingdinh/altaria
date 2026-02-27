import "@xterm/xterm/css/xterm.css";

import { useEffect, useRef } from "react";

import { resolveTheme } from "@/apps/terminal/components/Terminal/theme.ts";
import { useTerminalSession } from "@/apps/terminal/hooks/use-terminal-session.ts";
import { useTheme } from "@/components/theme-provider.tsx";

interface TerminalProps {
  sessionId: string;
  onSessionExit?: () => void;
}

export const Terminal = ({ sessionId, onSessionExit }: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const terminalRef = useTerminalSession(
    containerRef,
    resolveTheme(theme),
    sessionId,
    onSessionExit,
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
    <div ref={containerRef} className="absolute inset-0 z-10 overflow-hidden" />
  );
};
