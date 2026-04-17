"use client";

import { type MasterPanelGroup } from "@/lib/master-panel-layout";

type MasterViewPreset = "combat" | "explore" | "prep";

const presetLabels: Record<MasterViewPreset, string> = {
  combat: "Бой",
  explore: "Исследование",
  prep: "Подготовка",
};

export function MasterWorkspaceHeader({
  masterPreset,
  onPresetChange,
  activeGroups,
  groupLabels,
  onOpenLayoutEditor,
  onOpenLevelUpDrawer,
  levelUpEnabled,
  globalSearch,
  onGlobalSearchChange,
  onFocusInitiativePanel,
  onOpenShortcuts,
  initiativeOrder,
}: {
  masterPreset: MasterViewPreset;
  onPresetChange: (preset: MasterViewPreset) => void;
  activeGroups: readonly MasterPanelGroup[];
  groupLabels: Record<MasterPanelGroup, string>;
  onOpenLayoutEditor: () => void;
  onOpenLevelUpDrawer: () => void;
  levelUpEnabled: boolean;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  onFocusInitiativePanel: () => void;
  onOpenShortcuts: () => void;
  initiativeOrder: string[];
}) {
  return (
    <section className="master-workspace-header card relative z-10 space-y-4 overflow-hidden px-4 py-4 md:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Стол мастера</div>
          <div className="mt-1 text-sm text-slate-300">
            Единая панель режимов, шторок и быстрого доступа к рабочим зонам.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenLayoutEditor}
            className="inline-flex items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100"
          >
            Шторка раскладки
          </button>
          <button
            type="button"
            onClick={onOpenLevelUpDrawer}
            disabled={!levelUpEnabled}
            className="inline-flex items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Шторка повышения
          </button>
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100"
          >
            Shortcuts
          </button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] xl:items-start">
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2">
          {(["combat", "explore", "prep"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onPresetChange(preset)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                masterPreset === preset
                  ? "bg-fuchsia-500 text-slate-950"
                  : "border border-white/10 bg-slate-950/70 text-slate-200 hover:border-white/25"
              }`}
            >
              {presetLabels[preset]}
            </button>
          ))}
        </div>
        <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
          Режим управляет видимостью блоков, а шторки меняют детали панели и
          сценарии повышения уровня без перегрузки основного экрана.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Группы:</span>
        {activeGroups.map((group) => (
          <span
            key={group}
            className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
          >
            {groupLabels[group]}
          </span>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <label className="flex min-w-0 flex-col gap-1 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Global Search
          </span>
          <input
            value={globalSearch}
            onChange={(event) => onGlobalSearchChange(event.target.value)}
            placeholder="Поиск по токенам, персонажам, журналу..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Инициатива
            </span>
            <button
              type="button"
              onClick={onFocusInitiativePanel}
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100"
            >
              Открыть панель
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-300">
            {initiativeOrder.length
              ? initiativeOrder.join(" -> ")
              : "Порядок пока не сформирован"}
          </div>
        </div>
      </div>
    </section>
  );
}
