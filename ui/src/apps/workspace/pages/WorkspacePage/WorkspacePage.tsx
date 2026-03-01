import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { AppLayout } from "@/apps/core/components/AppLayout/AppLayout.tsx";
import { FileExplorer } from "@/apps/filesystem/components/FileExplorer";
import { GitChanges } from "@/apps/filesystem/components/GitChanges";
import type { WorkspaceView } from "@/apps/filesystem/types";
import { Terminal } from "@/apps/terminal/components/Terminal";
import { sessionsKey } from "@/apps/terminal/hooks/use-sessions";
import { cn } from "@/lib/utils";

import { ViewSwitcher } from "../../components/ViewSwitcher";
import { useWorkspace } from "../../hooks";

export const WorkspacePage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessionId = searchParams.get("session");
  const view = (searchParams.get("view") as WorkspaceView) || "terminal";
  const { data: workspace } = useWorkspace(workspaceId);

  const handleViewChange = useCallback(
    (newView: WorkspaceView) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newView === "terminal") {
            next.delete("view");
          } else {
            next.set("view", newView);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleSessionExit = useCallback(() => {
    if (workspaceId) {
      queryClient.invalidateQueries({
        queryKey: sessionsKey(workspaceId),
      });
      navigate(`/workspaces/${workspaceId}`);
    }
  }, [workspaceId, queryClient, navigate]);

  return (
    <AppLayout
      className="relative flex-1 overflow-hidden"
      headerContent={<ViewSwitcher value={view} onChange={handleViewChange} />}
    >
      <div className={cn("absolute inset-0", view !== "terminal" && "hidden")}>
        {sessionId ? (
          <Terminal
            key={sessionId}
            sessionId={sessionId}
            onSessionExit={handleSessionExit}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Create a session from the sidebar to get started
            </p>
          </div>
        )}
      </div>

      {workspace && (
        <>
          <div className={cn("absolute inset-0", view !== "files" && "hidden")}>
            <FileExplorer workspaceDirectory={workspace.directory} />
          </div>
          <div className={cn("absolute inset-0", view !== "git" && "hidden")}>
            <GitChanges workspaceDirectory={workspace.directory} />
          </div>
        </>
      )}
    </AppLayout>
  );
};
