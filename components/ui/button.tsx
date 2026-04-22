import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import {
  uiControlVariants,
  type UiSize,
  type UiState,
  type UiTone,
} from "@/components/ui/variants";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: UiSize;
  tone?: UiTone;
  state?: UiState;
};

export function Button({
  className,
  size,
  tone = "default",
  state,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(uiControlVariants({ size, tone, state }), className)}
      {...props}
    />
  );
}
