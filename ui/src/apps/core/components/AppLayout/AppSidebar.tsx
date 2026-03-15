import { type ComponentProps, Fragment } from "react";

import { NewTerminalDialog } from "@/apps/terminal/components/NewTerminalDialog";
import { NewTerminalSheet } from "@/apps/terminal/components/NewTerminalSheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from "@/components/ui/sidebar.tsx";

export const AppSidebar = ({ ...props }: ComponentProps<typeof Sidebar>) => {
  return (
    <Fragment>
      <Sidebar {...props}>
        <SidebarHeader />
        <SidebarContent className="gap-0" />
        <SidebarFooter>
          <SidebarMenu>
            <NewTerminalDialog />
            <NewTerminalSheet />
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </Fragment>
  );
};
