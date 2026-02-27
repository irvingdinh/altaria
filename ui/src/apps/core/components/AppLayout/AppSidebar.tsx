import React from "react";

import { NavWorkspaces } from "@/apps/workspace/components/NavWorkspaces";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar.tsx";

export const AppSidebar = ({
  ...props
}: React.ComponentProps<typeof Sidebar>) => {
  return (
    <Sidebar {...props}>
      <SidebarHeader>&nbsp;</SidebarHeader>
      <SidebarContent>
        <NavWorkspaces />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
