import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useCreateWorkspace, useUpdateWorkspace } from "../../hooks";
import type { Workspace } from "../../types";
import { DirectoryPicker } from "../DirectoryPicker";

interface WorkspaceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace?: Workspace;
}

export function WorkspaceFormDialog({
  open,
  onOpenChange,
  workspace,
}: WorkspaceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <WorkspaceForm
            key={workspace?.id ?? "create"}
            workspace={workspace}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceForm({
  workspace,
  onClose,
}: {
  workspace?: Workspace;
  onClose: () => void;
}) {
  const [name, setName] = useState(workspace?.name ?? "");
  const [directory, setDirectory] = useState(workspace?.directory ?? "");

  const createMutation = useCreateWorkspace();
  const updateMutation = useUpdateWorkspace();

  const isEdit = !!workspace;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = name.trim() !== "" && directory !== "" && !isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isEdit) {
      await updateMutation.mutateAsync({
        id: workspace.id,
        name: name.trim(),
        directory,
      });
    } else {
      await createMutation.mutateAsync({
        name: name.trim(),
        directory,
      });
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Workspace" : "New Workspace"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="workspace-name">Name</Label>
          <Input
            id="workspace-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workspace"
          />
        </div>
        <div className="grid gap-2">
          <Label>Directory</Label>
          <DirectoryPicker value={directory} onChange={setDirectory} />
          {directory && (
            <p className="text-muted-foreground truncate text-xs">
              {directory}
            </p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? "Saving..." : isEdit ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
