import React from "react";

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
      <SidebarContent>&nbsp;</SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
