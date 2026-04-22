import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { uiControlVariants, type UiTone } from "@/components/ui/variants";

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Exclude<UiTone, "ghost">;
};

export function Tag({ tone = "default", className, ...props }: TagProps) {
  return (
    <span
      className={cn(
        uiControlVariants({ size: "sm", tone }),
        "pointer-events-none h-auto min-h-0 px-3 py-1 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}
