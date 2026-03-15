import "@xterm/xterm/css/xterm.css";

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { AppLayout } from "@/apps/core/components/AppLayout";
import { useTerminal } from "@/apps/terminal/hooks/useTerminal";

export const TerminalPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sessions")
      .then((res) => res.json())
      .then((sessions: { id: string }[]) => {
        if (cancelled) return;
        if (!sessions.some((s) => s.id === id)) {
          navigate("/", { replace: true });
        } else {
          setVerified(true);
        }
      })
      .catch(() => {
        // Backend unreachable — allow terminal to attempt connection anyway
        if (!cancelled) setVerified(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (!verified) {
    return (
      <AppLayout>
        <div className="flex-1" style={{ backgroundColor: "#1e1e1e" }} />
      </AppLayout>
    );
  }

  return <VerifiedTerminal key={id} id={id!} />;
};

function VerifiedTerminal({ id }: { id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { status, exitCode } = useTerminal(id, containerRef);

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
}
