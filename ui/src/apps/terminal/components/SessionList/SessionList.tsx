import { TerminalIcon, XIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSessions } from "@/apps/terminal/hooks/useSessions";

export function SessionList() {
  const { sessions, refresh } = useSessions();
  const { id: activeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleClose = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    refresh();
    if (id === activeId) {
      navigate("/");
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Terminals</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sessions.map((session) => (
            <SidebarMenuItem key={session.id}>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <SidebarMenuButton
                    isActive={session.id === activeId}
                    onClick={() => navigate(`/terminals/${session.id}`)}
                    tooltip={session.cwd ?? "Terminal"}
                  >
                    <TerminalIcon />
                    <span>{session.cwd?.split("/").pop() ?? "~"}</span>
                  </SidebarMenuButton>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => handleClose(session.id)}
                  >
                    <XIcon />
                    Close
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
