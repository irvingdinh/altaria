import { FitAddon } from "@xterm/addon-fit";
import { ImageAddon } from "@xterm/addon-image";
import { LigaturesAddon } from "@xterm/addon-ligatures";
import { SearchAddon } from "@xterm/addon-search";
import { SerializeAddon } from "@xterm/addon-serialize";
import { type ITheme, Terminal as XTerm } from "@xterm/xterm";
import { type RefObject, useEffect, useRef } from "react";
import { toast } from "sonner";

import { AckDataBufferer } from "../lib/ack-data-bufferer";
import { DecorationAddon } from "../lib/decoration-addon";
import { ReconnectingWs } from "../lib/reconnecting-ws";
import { ShellIntegrationAddon } from "../lib/shell-integration-addon";

export interface TerminalSessionHandle {
  terminalRef: RefObject<XTerm | null>;
  sendInputRef: RefObject<((data: string) => void) | null>;
  ctrlActiveRef: RefObject<boolean>;
  shiftActiveRef: RefObject<boolean>;
  searchAddonRef: RefObject<SearchAddon | null>;
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
  const searchAddonRef = useRef<SearchAddon | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let terminalOpened = false;

    const isTouchOnly = window.matchMedia("(hover: none)").matches;

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

    const serializeAddon = new SerializeAddon();
    term.loadAddon(serializeAddon);

    const searchAddon = new SearchAddon();
    term.loadAddon(searchAddon);
    searchAddonRef.current = searchAddon;

    const shellIntegrationAddon = new ShellIntegrationAddon();
    term.loadAddon(shellIntegrationAddon);

    const decorationAddon = new DecorationAddon({
      shellIntegration: shellIntegrationAddon,
    });
    term.loadAddon(decorationAddon);

    const forceRefresh = () => {
      if (!terminalOpened || disposed) return;
      const currentCols = term.cols;
      const currentRows = term.rows;
      term.resize(currentCols, currentRows + 1);
      term.resize(currentCols, currentRows);
      fitAddon.fit();
    };

    const pendingFitTimers: ReturnType<typeof setTimeout>[] = [];
    const scheduleFit = (delayMs: number) => {
      pendingFitTimers.push(
        setTimeout(() => {
          if (!disposed && terminalOpened) forceRefresh();
        }, delayMs),
      );
    };

    const handleTransitionEnd = () => {
      if (!disposed && terminalOpened) fitAddon.fit();
    };
    container.addEventListener("transitionend", handleTransitionEnd);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const toastId = `terminal-reconnect-${sessionId}`;

    let ackBufferer: AckDataBufferer | null = null;
    let hasFittedOnData = false;

    const rws = new ReconnectingWs({
      url: `${protocol}//${window.location.host}/ws/terminal`,
      sessionId,
      onOpen: () => {
        const tryAttach = () => {
          if (disposed) return;
          if (!terminalOpened) {
            requestAnimationFrame(tryAttach);
            return;
          }
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

        ackBufferer = new AckDataBufferer((charCount) => {
          rws.send(JSON.stringify({ type: "ack", charCount }));
        });
      },
      onMessage: (msg) => {
        switch (msg.type) {
          case "output": {
            const data = (msg.data as string) ?? "";
            if (!hasFittedOnData && terminalOpened) {
              hasFittedOnData = true;
              scheduleFit(0);
            }
            term.write(data, () => {
              ackBufferer?.ack(data.length);
            });
            break;
          }
          case "replay": {
            const data = (msg.data as string) ?? "";
            if (!hasFittedOnData && terminalOpened) {
              hasFittedOnData = true;
              scheduleFit(0);
            }
            term.write(data);
            break;
          }
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        rws.checkAndReconnect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (isTouchOnly) {
      term.attachCustomKeyEventHandler((event) => {
        if (event.type !== "keydown") return true;

        const shiftFromBar = shiftActiveRef.current;
        const ctrlFromBar = ctrlActiveRef.current;

        if ((shiftFromBar || ctrlFromBar) && /^[a-zA-Z]$/.test(event.key)) {
          if (ctrlFromBar) {
            const charCode = event.key.toUpperCase().charCodeAt(0) - 64;
            sendInput(String.fromCharCode(charCode));
            ctrlActiveRef.current = false;
            ctrlConsumedRef?.current?.();
          } else {
            sendInput(event.key.toUpperCase());
          }

          if (shiftFromBar) {
            shiftActiveRef.current = false;
            shiftConsumedRef?.current?.();
          }

          event.preventDefault();
          return false;
        }

        if (event.key === "Enter") {
          sendInput(event.shiftKey ? "\r" : "\x1b\n");
          event.preventDefault();
          return false;
        }

        return true;
      });
    }

    term.onData((data) => {
      sendInput(data);
    });

    let touchStartY = 0;
    let isTouchScrolling = false;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      isTouchScrolling = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY - currentY;

      if (!isTouchScrolling && Math.abs(deltaY) < 10) return;
      isTouchScrolling = true;

      touchStartY = currentY;
      const lineHeight = Math.ceil(term.options.fontSize ?? 14);
      const lines = Math.round(deltaY / lineHeight);
      if (lines === 0) return;

      term.scrollLines(lines);
      e.preventDefault();
    };
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    const ACCESSORY_BAR_HEIGHT = isTouchOnly ? 40 : 0;
    const handleVisualViewportResize = () => {
      if (!window.visualViewport || !terminalOpened) return;
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

    const openTerminal = () => {
      if (terminalOpened || disposed) return;
      terminalOpened = true;

      term.open(container);

      if (term.textarea) {
        term.textarea.setAttribute("autocomplete", "off");
        term.textarea.setAttribute("enterkeyhint", "enter");
        term.textarea.style.caretColor = "transparent";
      }

      if (!isTouchOnly) {
        try {
          const ligaturesAddon = new LigaturesAddon();
          term.loadAddon(ligaturesAddon);
        } catch {
          // Ligatures not available
        }

        if ("WebAssembly" in window) {
          try {
            const imageAddon = new ImageAddon({
              sixelSupport: true,
              iipSupport: true,
            });
            term.loadAddon(imageAddon);
          } catch {
            // Image addon not available
          }
        }

      }

      // Force refresh to ensure proper rendering
      forceRefresh();

      // Re-fit after layout settles and after the sidebar's 200ms CSS transition
      scheduleFit(50);
      scheduleFit(250);
    };

    // Use ResizeObserver to detect when container gets dimensions
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        if (!terminalOpened) {
          openTerminal();
        } else {
          fitAddon.fit();
        }
      }
    });
    resizeObserver.observe(container);

    // Also check immediately in case container already has dimensions
    const { width, height } = container.getBoundingClientRect();
    if (width > 0 && height > 0) {
      openTerminal();
    }

    return () => {
      disposed = true;
      pendingFitTimers.forEach(clearTimeout);
      container.removeEventListener("transitionend", handleTransitionEnd);
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
      searchAddonRef.current = null;
      ctrlActiveRef.current = false;
      shiftActiveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return {
    terminalRef,
    sendInputRef,
    ctrlActiveRef,
    shiftActiveRef,
    searchAddonRef,
  };
}
