"use client";

type DrawerTab = "tokens" | "party";

const tabLabels: Record<DrawerTab, string> = {
  tokens: "Существа",
  party: "Персонажи",
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
  return (
    <>
      <button
        type="button"
        className="master-side-drawer__handle"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label={open ? "Скрыть шторку мастера" : "Показать шторку мастера"}
      >
        <span aria-hidden="true">{open ? "›" : "‹"}</span>
      </button>

      {open ? (
        <div
          className="master-side-drawer__controls"
          style={{ width: `min(92vw, ${width}px)` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {(["tokens", "party"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={`rounded-full border px-3 py-2 text-xs transition ${
                  activeTab === tab
                    ? "border-ember-300/60 bg-ember-400/15 text-ember-100"
                    : "border-white/10 bg-slate-950/40 text-slate-300 hover:border-rune-400/40 hover:text-white"
                }`}
              >
                {tabLabels[tab]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ml-auto rounded-full border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-slate-300 transition hover:border-white/25 hover:text-white"
            >
              Спрятать
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 text-xs text-slate-300">
            Ширина
            <input
              type="range"
              min="360"
              max="980"
              value={width}
              onChange={(event) => onWidthChange(Number(event.target.value))}
              className="min-w-0 flex-1"
            />
          </label>
        </div>
      ) : null}
    </>
  );
}

