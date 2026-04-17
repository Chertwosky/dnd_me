"use client";

import {
  MASTER_PANEL_IDS,
  type LayoutConfig,
  type MasterPanelId,
  type MasterPanelSize,
  getMasterPanelDefinition,
  getMasterPanelSizeLabel,
} from "@/lib/master-panel-layout";
import { MasterOverlayShell } from "@/components/master-overlay-shell";

const placementLabels = {
  primary: "Основная зона",
  secondary: "Боковая зона",
  utility: "Сервисная зона",
} as const;

export function MasterLayoutEditor({
  open,
  layoutConfig,
  onClose,
  onMovePanel,
  onSetPanelSize,
}: {
  open: boolean;
  layoutConfig: LayoutConfig;
  onClose: () => void;
  onMovePanel: (panelId: MasterPanelId, direction: "up" | "down") => void;
  onSetPanelSize: (panelId: MasterPanelId, size: MasterPanelSize) => void;
}) {
  return (
    <MasterOverlayShell open={open} onClose={onClose} placement="center" zIndexClass="z-[80]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Редактор раскладки
            </div>
            <div className="text-lg font-semibold text-white">
              Панели настраиваются отдельно от рабочего экрана
            </div>
            <p className="text-sm text-slate-300">
              Здесь задаются порядок и размер панелей. Основная рабочая сетка
              остаётся стабильной и не зависит от drag по двумерной раскладке.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200"
          >
            Закрыть
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="space-y-3">
            {layoutConfig.order.map((panelId, index) => {
              const definition = getMasterPanelDefinition(panelId);
              const size = layoutConfig.panels[panelId].size;
              return (
                <section
                  key={panelId}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {index + 1}. {definition.group}
                      </div>
                      <div className="break-words text-base font-semibold text-white">
                        {definition.title}
                      </div>
                      <div className="text-xs text-cyan-200/80">
                        {placementLabels[definition.desktopPlacement]}
                      </div>
                      <p className="break-words text-sm text-slate-300">
                        {definition.description}
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-col gap-3 lg:w-[320px]">
                      <label className="flex flex-col gap-2 text-sm text-slate-300">
                        <span>Размер панели</span>
                        <select
                          value={size}
                          onChange={(event) =>
                            onSetPanelSize(
                              panelId,
                              event.target.value as MasterPanelSize,
                            )
                          }
                          className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white"
                        >
                          {definition.allowedSizes.map((option) => (
                            <option key={option} value={option}>
                              {getMasterPanelSizeLabel(option)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onMovePanel(panelId, "up")}
                          disabled={index === 0}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
                        >
                          Выше
                        </button>
                        <button
                          type="button"
                          onClick={() => onMovePanel(panelId, "down")}
                          disabled={index === MASTER_PANEL_IDS.length - 1}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
                        >
                          Ниже
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
    </MasterOverlayShell>
  );
}
