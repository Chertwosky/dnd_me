import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Tag } from "@/components/ui/tag";

type SectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
};

export function SectionHeader({ title, description, badge, className, ...props }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)} {...props}>
      <div>
        <h2 className="text-xl font-semibold text-white md:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
      </div>
      {badge ? <Tag tone="secondary">{badge}</Tag> : null}
    </div>
  );
}
