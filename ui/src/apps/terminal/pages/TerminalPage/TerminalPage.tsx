import "@xterm/xterm/css/xterm.css";

import { useRef } from "react";
import { useParams } from "react-router";

import { AppLayout } from "@/apps/core/components/AppLayout";
import { useTerminal } from "@/apps/terminal/hooks/useTerminal";

export const TerminalPage = () => {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const { status, exitCode } = useTerminal(id!, containerRef);

  return (
    <AppLayout>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1"
          style={{ backgroundColor: "#1e1e1e" }}
        />

        {status === "disconnected" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="rounded-lg bg-zinc-900 px-6 py-4 text-center text-white shadow-lg">
              <p className="text-sm font-medium">Reconnecting...</p>
            </div>
          </div>
        )}

        {status === "exited" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="rounded-lg bg-zinc-900 px-6 py-4 text-center text-white shadow-lg">
              <p className="text-sm font-medium">
                Process exited (code {exitCode})
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
