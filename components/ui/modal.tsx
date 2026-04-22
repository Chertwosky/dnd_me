"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

type ModalProps = HTMLAttributes<HTMLDivElement> & {
  open: boolean;
  title: ReactNode;
  onClose?: () => void;
};

export function Modal({ open, title, onClose, className, children, ...props }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className={cn("w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6", className)} {...props}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <Button tone="ghost" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
