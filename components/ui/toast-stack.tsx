"use client";

export type ToastTone = "success" | "info" | "warning";

export type ToastMessage = {
  id: string;
  tone: ToastTone;
  text: string;
};

const toneClass: Record<ToastTone, string> = {
  success: "border-emerald-400/40 bg-emerald-500/20",
  warning: "border-amber-400/40 bg-amber-500/20",
  info: "border-cyan-400/40 bg-cyan-500/20",
};

export function ToastStack({
  toasts,
  className,
}: {
  toasts: ToastMessage[];
  className?: string;
}) {
  if (!toasts.length) return null;

  return (
    <div
      className={`pointer-events-none fixed right-4 top-4 z-[70] space-y-2 ${className ?? ""}`.trim()}
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border px-4 py-2 text-sm text-white shadow-lg ${toneClass[toast.tone]}`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
