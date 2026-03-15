import { PlusIcon } from "lucide-react";
import { useRef, useState } from "react";

import { FolderSelector } from "@/apps/terminal/components/FolderSelector";
import { useCreateSession } from "@/apps/terminal/hooks/useCreateSession.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar.tsx";

export const NewTerminalSheet = () => {
  const [open, setOpen] = useState(false);
  const selectedPathRef = useRef("");
  const { createSession, isSubmitting } = useCreateSession();

  const handleSubmit = () => {
    void createSession(selectedPathRef.current, () => setOpen(false));
  };

  return (
    <SidebarMenuItem className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <SidebarMenuButton>
            <PlusIcon />
            <span>New Terminal</span>
          </SidebarMenuButton>
        </SheetTrigger>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>New Terminal</SheetTitle>
            <SheetDescription>
              Select a working directory for the terminal session.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4">
            <FolderSelector
              onPathChange={(path) => {
                selectedPathRef.current = path;
              }}
            />
          </div>

          <SheetFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "New Terminal"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </SidebarMenuItem>
  );
};
