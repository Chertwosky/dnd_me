"use client";

import { useEffect, useRef, type ReactNode } from "react";

type OverlayPlacement = "center" | "right";

export function MasterOverlayShell({
  open,
  onClose,
  placement = "center",
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    const handleClose = () => {
      if (open) onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose, open]);

  return (
    <dialog
      ref={dialogRef}
      className={`arcane-dialog ${placement === "right" ? "arcane-dialog--right" : "arcane-dialog--center"}`}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div
        className={
          panelClassName ??
          "card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden"
        }
      >
        <div className={contentClassName ?? "overflow-y-auto"}>{children}</div>
      </div>
    </dialog>
  );
}
