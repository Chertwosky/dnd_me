"use client";

import { type ReactNode } from "react";

import {
  type MasterPanelId,
  type MasterPanelSize,
  getMasterPanelSizeLabel,
} from "@/lib/master-panel-layout";

export function MasterPanelShell({
  panelId,
  sectionLabel = "Панель мастера",
  title,
  description,
  size,
  hidden = false,
  style,
  className,
  children,
}: {
  panelId: MasterPanelId;
  sectionLabel?: string;
  title: string;
  description: string;
  size: MasterPanelSize;
  hidden?: boolean;
  style?: React.CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  const narrowContainerClass = "min-w-0 overflow-hidden";
  const narrowTitleClass = "truncate text-sm font-semibold text-parchment-100";
  const narrowDescriptionClass = "line-clamp-2 text-xs text-slate-400";
  return (
    <section
      data-master-panel={panelId}
      style={style}
      className={`master-panel-shell master-panel-shell--desk min-w-0 space-y-3 ${
        hidden ? "hidden" : ""
      } ${className ?? ""}`.trim()}
    >
      <div className={`flex ${narrowContainerClass} flex-col gap-3 rounded-2xl border border-white/10 bg-ink-950/75 px-4 py-3 sm:flex-row sm:items-start sm:justify-between`}>
        <div className={`${narrowContainerClass} space-y-1`}>
          <div className="eyebrow text-[11px]">
            {sectionLabel}
          </div>
          <div className={narrowTitleClass} title={title}>
            {title}
          </div>
          <p className={narrowDescriptionClass} title={description}>{description}</p>
        </div>
        <span className="badge w-fit shrink-0 border-arcane-400/30 bg-arcane-500/10 text-arcane-100">{getMasterPanelSizeLabel(size)}</span>
      </div>
      <div className={narrowContainerClass}>{children}</div>
    </section>
  );
}
