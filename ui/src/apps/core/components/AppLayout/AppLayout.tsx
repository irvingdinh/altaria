import React from "react";

import { AppHeader } from "@/apps/core/components/AppLayout/AppHeader.tsx";
import { AppSidebar } from "@/apps/core/components/AppLayout/AppSidebar.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";

export const AppLayout = ({
  children,
  ...otherProps
}: React.ComponentProps<"main">) => {
  return (
    <div className="[--header-height:calc(--spacing(12))]">
      <SidebarProvider className="flex flex-col">
        <AppHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <main {...otherProps}>{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};
