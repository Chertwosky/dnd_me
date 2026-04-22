import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-[var(--elevation-2)] backdrop-blur md:p-5",
        className,
      )}
      {...props}
    />
  );
}
