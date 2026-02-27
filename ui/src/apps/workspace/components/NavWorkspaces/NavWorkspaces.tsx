import {
  Folder,
  MoreHorizontal,
  Pencil,
  Plus,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { useCreateSession, useSessions } from "@/apps/terminal/hooks";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useWorkspaces } from "../../hooks";
import type { Workspace } from "../../types";
import { DeleteWorkspaceDialog } from "../DeleteWorkspaceDialog";
import { WorkspaceFormDialog } from "../WorkspaceFormDialog";

function WorkspaceItem({
  workspace,
  activeSessionId,
  onEdit,
  onDelete,
}: {
  workspace: Workspace;
  activeSessionId: string | null;
  onEdit: (w: Workspace) => void;
  onDelete: (w: Workspace) => void;
}) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const { data: sessions } = useSessions(workspace.id);
  const createSession = useCreateSession();

  const handleNewSession = async () => {
    const session = await createSession.mutateAsync(workspace.id);
    navigate(`/workspaces/${workspace.id}?session=${session.id}`);
  };

  return (
    <Collapsible defaultOpen>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <Folder className="size-4" />
            <span>{workspace.name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-48 rounded-lg"
            side="bottom"
            align={isMobile ? "end" : "start"}
          >
            <DropdownMenuItem onClick={handleNewSession}>
              <Plus className="text-muted-foreground" />
              <span>New Session</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(workspace)}>
              <Pencil className="text-muted-foreground" />
              <span>Edit</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(workspace)}>
              <Trash2 className="text-muted-foreground" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <CollapsibleContent>
          <SidebarMenuSub>
            {sessions?.map((session) => (
              <SidebarMenuSubItem key={session.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={activeSessionId === session.id}
                >
                  <Link
                    to={`/workspaces/${workspace.id}?session=${session.id}`}
                  >
                    <TerminalSquare className="size-3" />
                    <span>{session.id.slice(0, 8)}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavWorkspaces() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const [searchParams] = useSearchParams();
  const activeSessionId = searchParams.get("session");

  const [createOpen, setCreateOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState<Workspace | undefined>();
  const [deleteWorkspace, setDeleteWorkspace] = useState<
    Workspace | undefined
  >();

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
        <SidebarGroupAction
          className="top-2.5"
          title="New Workspace"
          onClick={() => setCreateOpen(true)}
        >
          <Plus /> <span className="sr-only">New Workspace</span>
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            {isLoading && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              </>
            )}

            {workspaces?.map((workspace) => (
              <WorkspaceItem
                key={workspace.id}
                workspace={workspace}
                activeSessionId={activeSessionId}
                onEdit={setEditWorkspace}
                onDelete={setDeleteWorkspace}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <WorkspaceFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      <WorkspaceFormDialog
        open={!!editWorkspace}
        onOpenChange={(open) => {
          if (!open) setEditWorkspace(undefined);
        }}
        workspace={editWorkspace}
      />

      {deleteWorkspace && (
        <DeleteWorkspaceDialog
          open={!!deleteWorkspace}
          onOpenChange={(open) => {
            if (!open) setDeleteWorkspace(undefined);
          }}
          workspace={deleteWorkspace}
        />
      )}
    </>
  );
}
