import type { LevelUpPreview } from '@/lib/level-up';

export function LevelUpSummary({ preview }: { preview: LevelUpPreview }) {
  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/50 p-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Level up summary</div>
        <div className="mt-1 text-sm text-slate-200">{preview.currentLevel} → {preview.targetCharacterLevel} уровень · {preview.targetClassId} {preview.targetClassLevel}</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/8 px-3 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Новые особенности</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {[...preview.classFeatures, ...preview.subclassFeatures].map((feature) => <li key={feature.id}>• {feature.name}</li>)}
            {!preview.classFeatures.length && !preview.subclassFeatures.length ? <li>• Нет новых особенностей</li> : null}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/8 px-3 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Итоговые изменения</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {preview.summary.map((line) => <li key={line}>• {line}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
