import React from "react";

import { AppHeader } from "@/apps/core/components/AppLayout/AppHeader.tsx";
import { AppSidebar } from "@/apps/core/components/AppLayout/AppSidebar.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";

interface AppLayoutProps extends React.ComponentProps<"main"> {
  headerContent?: React.ReactNode;
}

export const AppLayout = ({
  headerContent,
  children,
  ...otherProps
}: AppLayoutProps) => {
  return (
    <div className="h-full [--header-height:calc(--spacing(12))]">
      <SidebarProvider className="flex flex-col">
        <AppHeader centerContent={headerContent} />
        <div className="flex min-h-0 flex-1">
          <AppSidebar />
          <SidebarInset className="overflow-hidden">
            <main {...otherProps}>{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};
