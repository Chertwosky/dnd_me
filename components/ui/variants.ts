import { cn } from "@/lib/cn";

export type UiSize = "sm" | "md" | "lg";
export type UiTone = "default" | "primary" | "secondary" | "ghost" | "destructive" | "success";
export type UiState = "default" | "active" | "muted";

const sizeVariants: Record<UiSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const toneVariants: Record<UiTone, string> = {
  default: "border-white/10 bg-slate-900/70 text-slate-100 hover:border-white/20",
  primary: "border-fuchsia-400/30 bg-fuchsia-500/15 text-white hover:bg-fuchsia-500/25",
  secondary: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20",
  ghost: "border-transparent bg-transparent text-slate-200 hover:border-white/10 hover:bg-white/5",
  destructive: "border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20",
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
};

const stateVariants: Record<UiState, string> = {
  default: "",
  active: "ring-2 ring-cyan-400/30",
  muted: "opacity-60",
};

export function uiControlVariants({
  size = "md",
  tone = "default",
  state = "default",
}: {
  size?: UiSize;
  tone?: UiTone;
  state?: UiState;
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:pointer-events-none disabled:opacity-50",
    sizeVariants[size],
    toneVariants[tone],
    stateVariants[state],
  );
}
