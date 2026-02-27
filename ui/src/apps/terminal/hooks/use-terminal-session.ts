import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { type ITheme, Terminal as XTerm } from "@xterm/xterm";
import { type RefObject, useEffect, useRef } from "react";

export interface TerminalSessionHandle {
  terminalRef: RefObject<XTerm | null>;
  sendInputRef: RefObject<((data: string) => void) | null>;
  ctrlActiveRef: RefObject<boolean>;
}

function getResponsiveFontSize(): number {
  const width = window.innerWidth;
  if (width < 1024) return 12;
  return 14;
}

export function useTerminalSession(
  containerRef: RefObject<HTMLDivElement | null>,
  initialTheme: ITheme,
  sessionId: string,
  onSessionExit?: () => void,
  ctrlConsumedRef?: RefObject<(() => void) | null>,
): TerminalSessionHandle {
  const terminalRef = useRef<XTerm | null>(null);
  const sendInputRef = useRef<((data: string) => void) | null>(null);
  const ctrlActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new XTerm({
      theme: initialTheme,
      fontFamily: "ui-monospace, monospace",
      fontSize: getResponsiveFontSize(),
      cursorBlink: false,
      allowProposedApi: true,
    });
    terminalRef.current = term;

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(container);

    // Improve mobile keyboard behavior on xterm's hidden textarea
    if (term.textarea) {
      term.textarea.setAttribute("autocomplete", "off");
      term.textarea.setAttribute("enterkeyhint", "enter");
      term.textarea.style.caretColor = "transparent";
    }

    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // WebGL not available, fall back to canvas renderer
    }

    fitAddon.fit();

    // WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws/terminal`,
    );

    const sendInput = (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    };
    sendInputRef.current = sendInput;

    ws.addEventListener("open", () => {
      // Attach to the session first
      ws.send(JSON.stringify({ type: "attach", sessionId }));
      // Fit to current screen before sending resize so dimensions are fresh
      fitAddon.fit();
      ws.send(
        JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }),
      );
    });

    ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          data?: string;
          code?: number;
          message?: string;
        };

        switch (msg.type) {
          case "output":
            term.write(msg.data ?? "");
            break;
          case "exit":
            term.write(`\r\n[Process exited with code ${msg.code ?? 0}]`);
            onSessionExit?.();
            break;
          case "error":
            term.write(`\r\n[Error: ${msg.message ?? "unknown"}]`);
            if (msg.message === "Session not found") {
              onSessionExit?.();
            }
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener("close", () => {
      term.write("\r\n[Connection lost]");
    });

    // On touch-only devices (e.g. iPhone):
    // - Swap Enter: Enter → newline (Option+Enter), Shift+Enter → submit
    // - Intercept Ctrl+letter from the mobile accessory bar
    const isTouchOnly = window.matchMedia("(hover: none)").matches;
    if (isTouchOnly) {
      term.attachCustomKeyEventHandler((event) => {
        if (event.type !== "keydown") return true;

        // Ctrl modifier from accessory bar: intercept letter keys
        if (ctrlActiveRef.current && /^[a-zA-Z]$/.test(event.key)) {
          const charCode = event.key.toUpperCase().charCodeAt(0) - 64;
          sendInput(String.fromCharCode(charCode));
          ctrlActiveRef.current = false;
          ctrlConsumedRef?.current?.();
          event.preventDefault();
          return false;
        }

        // Enter swap: Enter → newline, Shift+Enter → submit
        if (event.key === "Enter") {
          sendInput(event.shiftKey ? "\r" : "\x1b\n");
          event.preventDefault();
          return false;
        }

        return true;
      });
    }

    // Terminal input → WebSocket
    term.onData((data) => {
      sendInput(data);
    });

    // Touch scrolling for mobile
    let touchStartY = 0;
    let isTouchScrolling = false;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      isTouchScrolling = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY - currentY;

      // Only intercept after a clear vertical swipe threshold
      if (!isTouchScrolling && Math.abs(deltaY) < 10) return;
      isTouchScrolling = true;

      touchStartY = currentY;
      const lineHeight = Math.ceil(term.options.fontSize ?? 14);
      const lines = Math.round(deltaY / lineHeight);
      if (lines !== 0) {
        term.scrollLines(lines);
      }
      e.preventDefault();
    };
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    // Resize handling
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    // Responsive font size based on viewport width
    const handleViewportResize = () => {
      const newSize = getResponsiveFontSize();
      if (term.options.fontSize !== newSize) {
        term.options.fontSize = newSize;
        fitAddon.fit();
      }
    };
    window.addEventListener("resize", handleViewportResize);

    // Visual viewport resize (handles mobile virtual keyboard)
    const ACCESSORY_BAR_HEIGHT = isTouchOnly ? 40 : 0;
    const handleVisualViewportResize = () => {
      if (!window.visualViewport) return;
      const rect = container.getBoundingClientRect();
      const visibleBottom =
        window.visualViewport.offsetTop + window.visualViewport.height;
      const availableHeight = Math.max(
        0,
        Math.floor(visibleBottom - rect.top) - ACCESSORY_BAR_HEIGHT,
      );
      container.style.height = `${availableHeight}px`;
      fitAddon.fit();
    };
    window.visualViewport?.addEventListener(
      "resize",
      handleVisualViewportResize,
    );
    window.visualViewport?.addEventListener(
      "scroll",
      handleVisualViewportResize,
    );

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", handleViewportResize);
      window.visualViewport?.removeEventListener(
        "resize",
        handleVisualViewportResize,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        handleVisualViewportResize,
      );
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
      terminalRef.current = null;
      sendInputRef.current = null;
      ctrlActiveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return { terminalRef, sendInputRef, ctrlActiveRef };
}
