import type { ComponentProps } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar.tsx";

export const AppSidebar = ({ ...props }: ComponentProps<typeof Sidebar>) => {
  return (
    <Sidebar {...props}>
      <SidebarHeader />
      <SidebarContent className="gap-0" />
      <SidebarRail />
    </Sidebar>
  );
};
