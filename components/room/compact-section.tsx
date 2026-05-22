import type { ReactNode } from "react";

export function CompactSection({
  title,
  description,
  badge,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      className={`compact-section arcane-panel group overflow-hidden ${className ?? ""}`}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 marker:content-none">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-parchment-100">{title}</h2>
            {badge ? (
              <span className="badge border-ember-300/30 bg-ember-400/10 text-ember-200">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          ) : null}
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <div className="compact-section__body border-t border-white/8 px-4 py-4">
        {children}
      </div>
    </details>
  );
}
