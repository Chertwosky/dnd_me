"use client";

import { useEffect, useMemo, useState } from "react";

type DrawerTab = "tokens" | "party";
const MASTER_SIDE_DRAWER_PANEL_ID = "master-side-drawer-panel";
const DRAWER_ICON_OPEN = "‹";
const DRAWER_ICON_CLOSE = "›";
const DRAWER_WIDTH_COMPACT = 480;
const DRAWER_WIDTH_ULTRA_COMPACT = 420;
const DRAWER_WIDTH_MIN = 360;
const DRAWER_WIDTH_MAX_DESKTOP = 980;
const DRAWER_WIDTH_MAX_TABLET = 760;
const DRAWER_WIDTH_MAX_MOBILE = 560;

const tabLabels: Record<DrawerTab, string> = {
  tokens: "Существа",
  party: "Персонажи",
};

const tabCompactLabels: Record<DrawerTab, string> = {
  tokens: "Сущ.",
  party: "Перс.",
};

const tabIcons: Record<DrawerTab, string> = {
  tokens: "🧟",
  party: "🧙",
};

export function MasterSideDrawer({
  open,
  activeTab,
  width,
  onOpenChange,
  onTabChange,
  onWidthChange,
}: {
  open: boolean;
  activeTab: DrawerTab;
  width: number;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: DrawerTab) => void;
  onWidthChange: (width: number) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);
  const isCompact = width < DRAWER_WIDTH_COMPACT;
  const isUltraCompact = width < DRAWER_WIDTH_ULTRA_COMPACT;
  const [drawerRangeMax, setDrawerRangeMax] = useState(DRAWER_WIDTH_MAX_DESKTOP);

  useEffect(() => {
    const updateDrawerRange = () => {
      const viewportWidth = window.innerWidth;
      const responsiveMax = Math.floor(viewportWidth * 0.92);
      const breakpointMax =
        viewportWidth < 768
          ? DRAWER_WIDTH_MAX_MOBILE
          : viewportWidth < 1280
            ? DRAWER_WIDTH_MAX_TABLET
            : DRAWER_WIDTH_MAX_DESKTOP;
      const nextMax = Math.max(DRAWER_WIDTH_MIN, Math.min(responsiveMax, breakpointMax));
      setDrawerRangeMax(nextMax);
    };

    updateDrawerRange();
    window.addEventListener("resize", updateDrawerRange);
    return () => window.removeEventListener("resize", updateDrawerRange);
  }, []);

  useEffect(() => {
    if (width > drawerRangeMax) {
      onWidthChange(drawerRangeMax);
    }
  }, [drawerRangeMax, onWidthChange, width]);

  const clampedWidth = useMemo(
    () => Math.min(Math.max(width, DRAWER_WIDTH_MIN), drawerRangeMax),
    [drawerRangeMax, width],
  );

  return (
    <>
      {open ? (
        <button
          type="button"
          className="master-side-drawer__backdrop"
          onClick={() => onOpenChange(false)}
          aria-label="Закрыть шторку мастера"
        />
      ) : null}
      <button
        type="button"
        className="master-side-drawer__handle"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={MASTER_SIDE_DRAWER_PANEL_ID}
        aria-label={open ? "Скрыть шторку мастера" : "Показать шторку мастера"}
        data-state={open ? "open" : "closed"}
      >
        <span aria-hidden="true">{open ? DRAWER_ICON_CLOSE : DRAWER_ICON_OPEN}</span>
      </button>

      <div
        id={MASTER_SIDE_DRAWER_PANEL_ID}
        className="master-side-drawer__controls"
        style={{ ["--drawer-width" as string]: `${clampedWidth}px` }}
        hidden={!open}
        data-state={open ? "open" : "closed"}
      >
        <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden sm:gap-2">
          {(["tokens", "party"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              aria-label={tabLabels[tab]}
              className={`min-w-0 shrink truncate rounded-full border py-2 text-xs transition ${
                isUltraCompact ? "px-2" : isCompact ? "px-2.5" : "px-3"
              } ${
                activeTab === tab
                  ? "border-ember-300/60 bg-ember-400/15 text-ember-100"
                  : "border-white/10 bg-slate-950/40 text-slate-300 hover:border-rune-400/40 hover:text-white"
              }`}
              title={tabLabels[tab]}
            >
              {isUltraCompact ? tabIcons[tab] : isCompact ? tabCompactLabels[tab] : tabLabels[tab]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Спрятать"
            className={`ml-auto min-w-0 shrink overflow-hidden truncate rounded-full border border-white/10 bg-slate-950/30 py-2 text-xs text-slate-300 transition hover:border-white/25 hover:text-white ${
              isCompact ? "px-2" : "px-3"
            }`}
            title="Спрятать"
          >
            {isCompact ? "✕" : "Спрятать"}
          </button>
        </div>
        <label
          className={`mt-2 flex min-w-0 items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-slate-950/35 text-xs text-slate-300 ${
            isCompact ? "px-2 py-1.5" : "px-3 py-1.5"
          }`}
          title="Ширина"
        >
          <span className="shrink-0 overflow-hidden truncate" aria-hidden="true">
            {isCompact ? "↔" : "Ширина"}
          </span>
          <input
            type="range"
            min={DRAWER_WIDTH_MIN}
            max={drawerRangeMax}
            value={Math.min(width, drawerRangeMax)}
            onChange={(event) => onWidthChange(Number(event.target.value))}
            className="min-w-0 flex-1"
            aria-label="Ширина боковой шторки"
          />
        </label>
      </div>
    </>
  );
}
