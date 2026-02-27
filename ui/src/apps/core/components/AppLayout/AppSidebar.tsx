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
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>&nbsp;</SidebarHeader>
      <SidebarContent className="md:pt-4">
        <NavWorkspaces />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
