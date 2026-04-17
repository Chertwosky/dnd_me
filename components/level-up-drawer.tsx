import type { LevelUpDraft, LevelUpPreview } from '@/lib/level-up';
import { classes, subclasses } from '@/lib/level-up';
import { MasterOverlayShell } from './master-overlay-shell';
import { LevelUpSummary } from './level-up-summary';

function ExternalRuleLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-cyan-300 underline underline-offset-4"
      onClick={(event) => event.stopPropagation()}
    >
      {label}
    </a>
  );
}

function AvailabilityBadge({ available, reasons }: { available: boolean; reasons: string[] }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-[11px] ${available ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-rose-400/30 bg-rose-500/10 text-rose-100'}`}>
      {available ? 'Доступно' : reasons[0] ?? 'Недоступно'}
    </span>
  );
}

export function LevelUpDrawer({
  open,
  draft,
  preview,
  onClose,
  onChange,
  onConfirm,
}: {
  open: boolean;
  draft: LevelUpDraft | null;
  preview: LevelUpPreview | null;
  onClose: () => void;
  onChange: (patch: Partial<LevelUpDraft>) => void;
  onConfirm: () => void;
}) {
  if (!open || !draft || !preview) return null;
  const currentSubclassOptions = subclasses.filter((item) => item.classId === draft.targetClassId);
  const hasBlocking = preview.blockedOptions.length > 0 || preview.missingSelections.length > 0;

  return (
    <MasterOverlayShell
      open={open}
      onClose={onClose}
      placement="right"
      zIndexClass="z-[80]"
      panelClassName="h-full w-full max-w-3xl overflow-hidden border-l border-white/10 bg-slate-950"
      contentClassName="h-full overflow-y-auto p-5"
    >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Повышение уровня</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">Пошаговое повышение уровня</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-200">Закрыть</button>
        </div>

        <div className="mt-5 space-y-5">
          <section className="rounded-3xl border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Шаг 1 · выбрать путь</div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {classes.map((classRef) => {
                const option = preview.multiclassOptions.find((item) => item.item.classId === classRef.id);
                const available = classRef.id === draft.targetClassId || option?.available;
                const reasons = option?.reasons.map((item) => item.message) ?? [];
                return (
                  <button key={classRef.id} type="button" onClick={() => onChange({ targetClassId: classRef.id, isMulticlass: classRef.id !== 'Wizard' && classRef.id !== draft.targetClassId ? true : classRef.id !== draft.targetClassId })} className={`rounded-2xl border px-3 py-3 text-left ${draft.targetClassId === classRef.id ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/8 bg-slate-900/40'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white">{classRef.name}</span>
                      <AvailabilityBadge available={Boolean(available)} reasons={reasons} />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">{classRef.id === draft.targetClassId && !draft.isMulticlass ? 'Продолжить текущий класс' : 'Взять уровень в другой класс'}</div>
                    <div className="mt-2">
                      <ExternalRuleLink href={classRef.href} label="Открыть описание класса" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <LevelUpSummary preview={preview} />

          <section className="rounded-3xl border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Шаг 3 · выбрать опции</div>
            <div className="mt-4 space-y-4">
              {preview.subclassOptions.length ? (
                <div>
                  <div className="mb-2 text-sm font-medium text-white">Подкласс</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {currentSubclassOptions.map((subclass) => (
                      <button key={subclass.id} type="button" onClick={() => onChange({ selectedSubclassId: subclass.id })} className={`rounded-2xl border px-3 py-3 text-left ${draft.selectedSubclassId === subclass.id ? 'border-fuchsia-400/40 bg-fuchsia-500/10' : 'border-white/8 bg-slate-900/40'}`}>
                        <div className="font-medium text-white">{subclass.name}</div>
                        <div className="mt-1 text-xs text-slate-400">{Object.values(subclass.featuresByLevel).flat().slice(0, 2).join(', ')}</div>
                        <div className="mt-2">
                          <ExternalRuleLink href={subclass.href} label="Открыть описание класса / подкласса" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {preview.asi.available ? (
                <div>
                  <div className="mb-2 text-sm font-medium text-white">ASI / Feat</div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onChange({ selectedAbilityIncrease: { int: 1, wis: 1 }, selectedFeatId: undefined })} className={`rounded-full border px-3 py-2 text-sm ${draft.selectedAbilityIncrease ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 text-slate-200'}`}>+1 INT / +1 WIS</button>
                    {preview.feats.map((feat) => (
                      <button key={feat.item.id} type="button" onClick={() => feat.available && onChange({ selectedFeatId: feat.item.id, selectedAbilityIncrease: undefined })} className={`rounded-full border px-3 py-2 text-sm ${draft.selectedFeatId === feat.item.id ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100' : 'border-white/10 text-slate-200'} ${!feat.available ? 'opacity-60' : ''}`}>
                        {feat.item.name} · {feat.available ? 'Доступно' : feat.reasons[0]?.message}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {preview.feats.map((feat) => (
                      <ExternalRuleLink key={`${feat.item.id}-link`} href={feat.item.href} label={`Ссылка: ${feat.item.name}`} />
                    ))}
                  </div>
                </div>
              ) : null}

              {preview.spells.length ? (
                <div>
                  <div className="mb-2 text-sm font-medium text-white">Заклинания</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {preview.spells.map((spell) => {
                      const selected = draft.selectedSpellIds.includes(spell.item.id);
                      return (
                        <button key={spell.item.id} type="button" onClick={() => onChange({ selectedSpellIds: selected ? draft.selectedSpellIds.filter((id) => id !== spell.item.id) : [...draft.selectedSpellIds, spell.item.id] })} className={`rounded-2xl border px-3 py-3 text-left ${selected ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/8 bg-slate-900/40'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-white">{spell.item.name}</div>
                            <span className="text-xs text-slate-400">{spell.item.level === 0 ? 'Заговор' : `${spell.item.level} круг`}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-400">{spell.item.school}</div>
                          <div className="mt-2">
                            <ExternalRuleLink href={spell.item.href} label="Открыть заклинание" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-2 text-sm font-medium text-white">Заблокированные причины</div>
                <div className="flex flex-wrap gap-2">
                  {[...preview.blockedOptions.map((item) => item.message), ...preview.feats.flatMap((item) => item.available ? [] : item.reasons.map((reason) => `${item.item.name}: ${reason.message}`)), ...preview.multiclassOptions.flatMap((item) => item.available ? [] : item.reasons.map((reason) => `${item.item.classId}: ${reason.message}`))].map((reason) => (
                    <span key={reason} className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100">{reason}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Шаг 4 · подтвердить</div>
            {hasBlocking ? (
              <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">Перед подтверждением завершите обязательные выборы: {preview.missingSelections.concat(preview.blockedOptions.map((item) => item.message)).join('; ')}</div>
            ) : (
              <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">Все обязательные выборы сделаны. Можно подтверждать.</div>
            )}
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={onConfirm} disabled={hasBlocking} className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">Подтвердить повышение</button>
              <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">Сохранить как draft и закрыть</button>
            </div>
          </section>
        </div>
    </MasterOverlayShell>
  );
}
