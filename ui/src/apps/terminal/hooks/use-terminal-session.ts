import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { type ITheme, Terminal as XTerm } from "@xterm/xterm";
import { type RefObject, useEffect, useRef } from "react";
import { toast } from "sonner";

import { ReconnectingWs } from "../lib/reconnecting-ws";

export interface TerminalSessionHandle {
  terminalRef: RefObject<XTerm | null>;
  sendInputRef: RefObject<((data: string) => void) | null>;
  ctrlActiveRef: RefObject<boolean>;
  shiftActiveRef: RefObject<boolean>;
}

export function useTerminalSession(
  containerRef: RefObject<HTMLDivElement | null>,
  initialTheme: ITheme,
  sessionId: string,
  onSessionExit?: () => void,
  ctrlConsumedRef?: RefObject<(() => void) | null>,
  shiftConsumedRef?: RefObject<(() => void) | null>,
): TerminalSessionHandle {
  const terminalRef = useRef<XTerm | null>(null);
  const sendInputRef = useRef<((data: string) => void) | null>(null);
  const ctrlActiveRef = useRef<boolean>(false);
  const shiftActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const term = new XTerm({
      theme: initialTheme,
      fontFamily: "ui-monospace, monospace",
      fontSize: 12,
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

    // Skip WebGL on touch-only devices (mobile) — the canvas renderer is
    // sufficient for terminal use and avoids a timing issue where the WebGL
    // context initializes before the container has final dimensions, leaving
    // the terminal invisible until a resize event forces a repaint.
    const isTouchOnly = window.matchMedia("(hover: none)").matches;
    if (!isTouchOnly) {
      try {
        term.loadAddon(new WebglAddon());
      } catch {
        // WebGL not available, fall back to canvas renderer
      }
    }

    fitAddon.fit();

    // WebSocket connection with auto-reconnect
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const toastId = `terminal-reconnect-${sessionId}`;

    const rws = new ReconnectingWs({
      url: `${protocol}//${window.location.host}/ws/terminal`,
      sessionId,
      onOpen: () => {
        const tryAttach = () => {
          if (disposed) return;
          const dims = fitAddon.proposeDimensions();
          if (dims && dims.cols > 0 && dims.rows > 0) {
            fitAddon.fit();
            rws.send(
              JSON.stringify({
                type: "attach",
                sessionId,
                cols: term.cols,
                rows: term.rows,
              }),
            );
          } else {
            requestAnimationFrame(tryAttach);
          }
        };
        tryAttach();
      },
      onMessage: (msg) => {
        switch (msg.type) {
          case "output":
            term.write((msg.data as string) ?? "");
            break;
          case "exit":
            term.write(
              `\r\n[Process exited with code ${(msg.code as number) ?? 0}]`,
            );
            break;
          case "error":
            term.write(`\r\n[Error: ${(msg.message as string) ?? "unknown"}]`);
            break;
        }
      },
      onReconnected: () => {
        term.clear();
        toast.dismiss(toastId);
      },
      onGaveUp: () => {
        toast.error("Terminal connection lost. Retrying...", {
          duration: Infinity,
          id: toastId,
        });
      },
      onSessionLost: () => {
        onSessionExit?.();
      },
    });

    const sendInput = (data: string) => {
      rws.send(JSON.stringify({ type: "input", data }));
    };
    sendInputRef.current = sendInput;

    // Reconnect immediately when tab/app becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        rws.checkAndReconnect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // On touch-only devices (e.g. iPhone):
    // - Swap Enter: Enter → newline (Option+Enter), Shift+Enter → submit
    // - Intercept Ctrl+letter from the mobile accessory bar
    if (isTouchOnly) {
      term.attachCustomKeyEventHandler((event) => {
        if (event.type !== "keydown") return true;

        const shiftFromBar = shiftActiveRef.current;
        const ctrlFromBar = ctrlActiveRef.current;

        // Modifier keys from accessory bar: intercept letter keys
        if ((shiftFromBar || ctrlFromBar) && /^[a-zA-Z]$/.test(event.key)) {
          if (ctrlFromBar) {
            // Ctrl+letter (or Ctrl+Shift+letter): send control code
            const charCode = event.key.toUpperCase().charCodeAt(0) - 64;
            sendInput(String.fromCharCode(charCode));
            ctrlActiveRef.current = false;
            ctrlConsumedRef?.current?.();
          } else {
            // Shift+letter only: send uppercase
            sendInput(event.key.toUpperCase());
          }

          if (shiftFromBar) {
            shiftActiveRef.current = false;
            shiftConsumedRef?.current?.();
          }

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
      if (lines === 0) return;

      if (term.modes.mouseTrackingMode !== "none") {
        // Mouse tracking active (tmux with mouse on): dispatch synthetic
        // wheel events so xterm.js encodes them as mouse escape sequences
        // that tmux can handle for scrolling.
        const screenEl = container.querySelector(".xterm-screen");
        if (screenEl) {
          const rect = screenEl.getBoundingClientRect();
          const count = Math.abs(lines);
          for (let i = 0; i < count; i++) {
            screenEl.dispatchEvent(
              new WheelEvent("wheel", {
                deltaY: lines > 0 ? 1 : -1,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                bubbles: true,
                cancelable: true,
              }),
            );
          }
        }
      } else {
        // No mouse tracking: scroll xterm's own buffer.
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
      rws.send(JSON.stringify({ type: "resize", cols, rows }));
    });

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      window.visualViewport?.removeEventListener(
        "resize",
        handleVisualViewportResize,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        handleVisualViewportResize,
      );
      resizeObserver.disconnect();
      rws.dispose();
      toast.dismiss(toastId);
      term.dispose();
      terminalRef.current = null;
      sendInputRef.current = null;
      ctrlActiveRef.current = false;
      shiftActiveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return { terminalRef, sendInputRef, ctrlActiveRef, shiftActiveRef };
}
