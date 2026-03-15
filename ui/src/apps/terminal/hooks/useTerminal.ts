import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

import {
  encodeStdin,
  encodeResize,
  parseServerMessage,
} from "../lib/protocol";

type TerminalStatus = "connecting" | "connected" | "disconnected" | "exited";

interface UseTerminalResult {
  status: TerminalStatus;
  exitCode?: number;
}

export function useTerminal(
  terminalId: string,
  containerRef: React.RefObject<HTMLDivElement | null>,
): UseTerminalResult {
  const [status, setStatus] = useState<TerminalStatus>("connecting");
  const [exitCode, setExitCode] = useState<number | undefined>();

  const terminalRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const mountedRef = useRef(true);
  const exitedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    exitedRef.current = false;

    const container = containerRef.current;
    if (!container) return;

    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
      },
      fontFamily:
        "'Geist Mono', 'SF Mono', Monaco, 'Cascadia Code', monospace",
      fontSize: 14,
      scrollback: 10_000,
    });
    terminalRef.current = terminal;

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    terminal.focus();

    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
      });
    });
    resizeObserver.observe(container);

    // Wire terminal input/resize to WebSocket
    const onDataDisposable = terminal.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(encodeStdin(data));
      }
    });

    const onResizeDisposable = terminal.onResize(({ cols, rows }) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(encodeResize(cols, rows));
      }
    });

    // WebSocket connection
    function connect() {
      if (!mountedRef.current) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/ws/terminals/${terminalId}`,
      );
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      setStatus("connecting");

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus("connected");
        reconnectAttemptRef.current = 0;
        // Sync terminal dimensions with backend
        fitAddonRef.current?.fit();
      };

      ws.onmessage = (event) => {
        const msg = parseServerMessage(event.data as ArrayBuffer);
        if (msg.type === "output") {
          terminal.write(msg.data);
        } else if (msg.type === "exit") {
          exitedRef.current = true;
          setStatus("exited");
          setExitCode(msg.code);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        if (!exitedRef.current) {
          setStatus("disconnected");
          scheduleReconnect();
        }
      };
    }

    function scheduleReconnect() {
      if (!mountedRef.current || exitedRef.current) return;
      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(500 * Math.pow(2, attempt), 10_000);
      reconnectAttemptRef.current = attempt + 1;

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current && !exitedRef.current) {
          terminal.reset();
          connect();
        }
      }, delay);
    }

    connect();

    // Cleanup
    return () => {
      mountedRef.current = false;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      resizeObserver.disconnect();

      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
      }
      terminal.dispose();

      terminalRef.current = null;
      wsRef.current = null;
      fitAddonRef.current = null;
    };
  }, [terminalId]);

  return { status, exitCode };
}
