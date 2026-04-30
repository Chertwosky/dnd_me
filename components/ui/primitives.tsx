import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Tone = "primary" | "secondary" | "ghost" | "danger";

const buttonToneClass: Record<Tone, string> = {
  primary: "arcane-button-primary",
  secondary: "arcane-button-secondary",
  ghost: "bg-white/5 hover:bg-white/10",
  danger: "border-rose-400/30 bg-rose-500/10 text-rose-100 hover:border-rose-300/60",
};

export function Button({
  tone = "ghost",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return <button className={cx("arcane-button", buttonToneClass[tone], className)} {...props} />;
}

export function LinkButton({
  tone = "ghost",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return <span className={cx("arcane-button", buttonToneClass[tone], className)}>{children}</span>;
}

export function Panel({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cx("arcane-panel p-5", className)}>
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      {title ? <h2 className="mt-2 text-xl font-semibold tracking-tight text-parchment-100">{title}</h2> : null}
      {description ? <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p> : null}
      {children ? <div className={title || description || eyebrow ? "mt-5" : undefined}>{children}</div> : null}
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "ember" | "rune" | "arcane" | "success";
  className?: string;
}) {
  const toneClass = {
    neutral: "border-white/10 bg-white/5 text-parchment-100",
    ember: "border-ember-300/30 bg-ember-400/10 text-ember-200",
    rune: "border-rune-400/30 bg-rune-500/10 text-rune-100",
    arcane: "border-arcane-400/30 bg-arcane-500/10 text-arcane-100",
    success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  }[tone];

  return <span className={cx("badge", toneClass, className)}>{children}</span>;
}

export function Field({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      {label ? <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</span> : null}
      <input className={cx("arcane-input", className)} {...props} />
    </label>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-6 text-center">
      <div className="text-base font-semibold text-parchment-100">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

