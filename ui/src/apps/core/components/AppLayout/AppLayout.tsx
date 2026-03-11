import type { ReactNode } from "react";

import { AppSidebar } from "@/apps/core/components/AppLayout/AppSidebar.tsx";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar.tsx";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};
