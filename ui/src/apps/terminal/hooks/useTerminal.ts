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

  useEffect(() => {
    // Local flag scoped to this effect invocation — cannot leak across
    // cleanup/setup cycles the way a shared ref can.
    let active = true;

    const container = containerRef.current;
    if (!container) return;

    let wsRef: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let exited = false;

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

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    terminal.focus();

    requestAnimationFrame(() => {
      if (active) fitAddon.fit();
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (active) fitAddon.fit();
      });
    });
    resizeObserver.observe(container);

    // Wire terminal input/resize to WebSocket
    const onDataDisposable = terminal.onData((data) => {
      if (wsRef && wsRef.readyState === WebSocket.OPEN) {
        wsRef.send(encodeStdin(data));
      }
    });

    const onResizeDisposable = terminal.onResize(({ cols, rows }) => {
      if (wsRef && wsRef.readyState === WebSocket.OPEN) {
        wsRef.send(encodeResize(cols, rows));
      }
    });

    // WebSocket connection
    function connect() {
      if (!active) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/ws/terminals/${terminalId}`,
      );
      ws.binaryType = "arraybuffer";
      wsRef = ws;

      setStatus("connecting");

      ws.onopen = () => {
        if (!active) return;
        setStatus("connected");
        reconnectAttempt = 0;
        // Sync terminal dimensions with backend
        fitAddon.fit();
        // Send current dimensions explicitly (onResize only fires on change)
        const { cols, rows } = terminal;
        ws.send(encodeResize(cols, rows));
        // Re-focus after navigation/dialog close
        terminal.focus();
      };

      ws.onmessage = (event) => {
        if (!active) return;
        const msg = parseServerMessage(event.data as ArrayBuffer);
        if (msg.type === "output") {
          terminal.write(msg.data);
        } else if (msg.type === "exit") {
          exited = true;
          setStatus("exited");
          setExitCode(msg.code);
        }
      };

      ws.onclose = () => {
        if (!active) return;
        if (!exited) {
          setStatus("disconnected");
          scheduleReconnect();
        }
      };
    }

    function scheduleReconnect() {
      if (!active || exited) return;
      const delay = Math.min(500 * Math.pow(2, reconnectAttempt), 10_000);
      reconnectAttempt += 1;

      reconnectTimer = setTimeout(() => {
        if (active && !exited) {
          terminal.reset();
          connect();
        }
      }, delay);
    }

    connect();

    // Cleanup
    return () => {
      active = false;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      resizeObserver.disconnect();

      if (wsRef) {
        wsRef.close(1000, "Component unmounted");
      }
      terminal.dispose();
    };
  }, [terminalId]);

  return { status, exitCode };
}
