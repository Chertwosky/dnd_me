"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";

type DrawerProps = HTMLAttributes<HTMLDivElement> & {
  open: boolean;
  title?: ReactNode;
  side?: "left" | "right";
  onClose?: () => void;
};

export function Drawer({ open, title, side = "right", onClose, className, children, ...props }: DrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm">
      <div
        className={cn(
          "absolute top-0 h-full w-full max-w-xl border-white/10 bg-slate-950/95 p-4 shadow-[var(--elevation-3)]",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-white">{title}</div>
          <IconButton aria-label="Закрыть" onClick={onClose}>
            ✕
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
