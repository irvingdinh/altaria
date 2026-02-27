import { SidebarIcon } from "lucide-react";

import { ModeToggle } from "@/apps/core/components/AppLayout/ModeToggle.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useSidebar } from "@/components/ui/sidebar.tsx";

export const AppHeader = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-2">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>

        <div className="ml-auto">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
};
