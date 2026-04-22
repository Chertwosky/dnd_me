import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { uiControlVariants, type UiState, type UiTone } from "@/components/ui/variants";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: UiTone;
  state?: UiState;
};

export function IconButton({ className, tone = "ghost", state, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(uiControlVariants({ size: "sm", tone, state }), "h-9 w-9 p-0", className)}
      {...props}
    />
  );
}
