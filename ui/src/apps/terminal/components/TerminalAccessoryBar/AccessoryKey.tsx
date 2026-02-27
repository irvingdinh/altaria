import React from "react";

import { cn } from "@/lib/utils.ts";

interface AccessoryKeyProps {
  label: string;
  active?: boolean;
  onTap: () => void;
  onPreventFocus: (e: React.PointerEvent | React.TouchEvent) => void;
}

export const AccessoryKey = ({
  label,
  active,
  onTap,
  onPreventFocus,
}: AccessoryKeyProps) => {
  return (
    <button
      type="button"
      className={cn(
        "text-foreground/80 border-border flex h-7 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium select-none",
        "active:bg-muted/80 transition-colors",
        active && "bg-primary text-primary-foreground border-primary",
      )}
      onPointerDown={onPreventFocus}
      onTouchStart={onPreventFocus}
      onClick={onTap}
    >
      {label}
    </button>
  );
};
