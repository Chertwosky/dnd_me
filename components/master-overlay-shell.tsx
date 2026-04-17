"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";

type OverlayPlacement = "center" | "right";

export function MasterOverlayShell({
  open,
  onClose,
  placement = "center",
  zIndexClass = "z-[80]",
  panelClassName,
  contentClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  placement?: OverlayPlacement;
  zIndexClass?: string;
  panelClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const justifyClass =
    placement === "right" ? "items-stretch justify-end" : "items-center justify-center";

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex ${justifyClass} bg-slate-950/75 p-4 backdrop-blur-sm`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={panelClassName ?? "card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden"}
        role="dialog"
        aria-modal="true"
      >
        <div className={contentClassName ?? "overflow-y-auto"}>{children}</div>
      </div>
    </div>
  );
}
