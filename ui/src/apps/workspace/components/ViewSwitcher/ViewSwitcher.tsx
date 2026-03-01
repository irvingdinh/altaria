import { FolderTree, GitBranch, TerminalSquare } from "lucide-react";

import type { WorkspaceView } from "@/apps/filesystem/types";
import { cn } from "@/lib/utils";

const views: {
  value: WorkspaceView;
  label: string;
  icon: typeof TerminalSquare;
}[] = [
  { value: "terminal", label: "Terminal", icon: TerminalSquare },
  { value: "files", label: "Files", icon: FolderTree },
  { value: "git", label: "Git", icon: GitBranch },
];

interface ViewSwitcherProps {
  value: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div className="bg-muted flex gap-1 rounded-lg p-1">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = value === view.value;

        return (
          <button
            key={view.value}
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(view.value)}
          >
            <Icon className="size-4" />
            <span className="hidden md:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
