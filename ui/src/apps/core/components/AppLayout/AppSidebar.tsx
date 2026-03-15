import { type ComponentProps, Fragment } from "react";

import { NewTerminalDialog } from "@/apps/terminal/components/NewTerminalDialog";
import { NewTerminalSheet } from "@/apps/terminal/components/NewTerminalSheet";
import { SessionList } from "@/apps/terminal/components/SessionList";
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
        <SidebarContent className="gap-0">
          <SessionList />
        </SidebarContent>
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
