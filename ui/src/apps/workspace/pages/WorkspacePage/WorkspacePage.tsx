import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { AppLayout } from "@/apps/core/components/AppLayout/AppLayout.tsx";
import { Terminal } from "@/apps/terminal/components/Terminal";
import { sessionsKey } from "@/apps/terminal/hooks/use-sessions";

export const WorkspacePage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessionId = searchParams.get("session");

  const handleSessionExit = useCallback(() => {
    if (workspaceId) {
      queryClient.invalidateQueries({
        queryKey: sessionsKey(workspaceId),
      });
      navigate(`/workspaces/${workspaceId}`);
    }
  }, [workspaceId, queryClient, navigate]);

  return (
    <AppLayout className="flex flex-1 overflow-hidden">
      {sessionId ? (
        <Terminal
          key={sessionId}
          sessionId={sessionId}
          onSessionExit={handleSessionExit}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Create a session from the sidebar to get started
          </p>
        </div>
      )}
    </AppLayout>
  );
};
