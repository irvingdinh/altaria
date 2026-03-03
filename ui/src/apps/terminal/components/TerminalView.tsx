import { useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { useTerminal } from '../hooks/useTerminal';

export function TerminalView({ sessionId }: { sessionId?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTerminal(sessionId, containerRef);

  if (!sessionId) {
    return (
      <div className="terminal-placeholder">
        Select or create a session to begin.
      </div>
    );
  }

  return <div ref={containerRef} className="terminal-container" key={sessionId} />;
}
