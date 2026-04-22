import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Tag } from "@/components/ui/tag";

type ToastTone = "info" | "success" | "warning";

const toneClassMap: Record<ToastTone, string> = {
  info: "border-cyan-400/30 bg-cyan-500/10",
  success: "border-emerald-400/30 bg-emerald-500/10",
  warning: "border-amber-400/30 bg-amber-500/10",
};

type ToastProps = HTMLAttributes<HTMLDivElement> & {
  tone?: ToastTone;
  title?: ReactNode;
};

export function Toast({ tone = "info", title, className, children, ...props }: ToastProps) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm text-slate-100", toneClassMap[tone], className)} {...props}>
      {title ? (
        <div className="mb-2 flex items-center justify-between gap-3">
          <strong>{title}</strong>
          <Tag tone={tone === "warning" ? "destructive" : tone === "success" ? "success" : "secondary"}>{tone}</Tag>
        </div>
      ) : null}
      {children}
    </div>
  );
}
