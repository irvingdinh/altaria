import { Folder, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  useSidebar,
} from "@/components/ui/sidebar";

import { useWorkspaces } from "../../hooks";
import type { Workspace } from "../../types";
import { DeleteWorkspaceDialog } from "../DeleteWorkspaceDialog";
import { WorkspaceFormDialog } from "../WorkspaceFormDialog";

export function NavWorkspaces() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { isMobile } = useSidebar();

  const [createOpen, setCreateOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState<Workspace | undefined>();
  const [deleteWorkspace, setDeleteWorkspace] = useState<
    Workspace | undefined
  >();

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
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
              <Collapsible key={workspace.id}>
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
                      side={isMobile ? "bottom" : "right"}
                      align={isMobile ? "end" : "start"}
                    >
                      <DropdownMenuItem
                        onClick={() => setEditWorkspace(workspace)}
                      >
                        <Pencil className="text-muted-foreground" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteWorkspace(workspace)}
                      >
                        <Trash2 className="text-muted-foreground" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <p className="text-muted-foreground px-2 py-1 text-xs">
                        No sessions yet
                      </p>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}

            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-sidebar-foreground/70"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                <span>New Workspace</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
