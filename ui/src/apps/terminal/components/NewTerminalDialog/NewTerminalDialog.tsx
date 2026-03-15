import { PlusIcon } from "lucide-react";
import { useRef, useState } from "react";

import { FolderSelector } from "@/apps/terminal/components/FolderSelector";
import { useCreateSession } from "@/apps/terminal/hooks/useCreateSession.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar.tsx";

export const NewTerminalDialog = () => {
  const [open, setOpen] = useState(false);
  const selectedPathRef = useRef("");
  const { createSession, isSubmitting } = useCreateSession();

  const handleSubmit = () => {
    void createSession(selectedPathRef.current, () => setOpen(false));
  };

  return (
    <SidebarMenuItem className="hidden md:block">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <SidebarMenuButton>
            <PlusIcon />
            <span>New Terminal</span>
          </SidebarMenuButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Terminal</DialogTitle>
            <DialogDescription>
              Select a working directory for the terminal session.
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-4 px-4">
            <FolderSelector
              onPathChange={(path) => {
                selectedPathRef.current = path;
              }}
            />
          </div>

          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "New Terminal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  );
};
