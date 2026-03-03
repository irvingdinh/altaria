import { useEffect, useRef, type RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { encodeStdin, encodeResize } from '../../../lib/protocol';

export function useTerminal(
  sessionId: string | undefined,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId || !containerRef.current) return;
    const container = containerRef.current;

    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
      },
      fontFamily: 'monospace',
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();

    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${wsProtocol}//${location.host}/ws/terminals/${sessionId}`,
    );
    ws.binaryType = 'arraybuffer';

    ws.addEventListener('open', () => {
      const { cols, rows } = terminal;
      ws.send(encodeResize(cols, rows));
    });

    ws.addEventListener('message', (e) => {
      terminal.write(new Uint8Array(e.data as ArrayBuffer));
    });

    ws.addEventListener('close', () => {
      terminal.write('\r\n\x1b[90m[Session disconnected]\x1b[0m\r\n');
    });

    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(encodeStdin(data));
      }
    });

    terminal.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(encodeResize(cols, rows));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    cleanupRef.current = () => {
      resizeObserver.disconnect();
      terminal.dispose();
      if (ws.readyState <= WebSocket.OPEN) ws.close();
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [sessionId]);
}
