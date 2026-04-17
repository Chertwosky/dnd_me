import type { CharacterProgression } from '@/lib/level-up';

export function CharacterXpCard({ progression, mode }: { progression: CharacterProgression; mode: 'xp' | 'milestone' }) {
  const progressRatio = mode === 'xp' && progression.nextLevelXp
    ? Math.min(100, Math.max(0, (progression.currentXp / progression.nextLevelXp) * 100))
    : progression.canLevelUp ? 100 : 0;
  const stateTone = progression.levelUpState === 'in_progress'
    ? 'border-amber-400/30 bg-amber-500/10'
    : progression.canLevelUp
      ? 'border-emerald-400/30 bg-emerald-500/10'
      : 'border-white/10 bg-slate-950/40';

  return (
    <div className={`rounded-3xl border p-4 ${stateTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Прогрессия</div>
          <div className="mt-1 text-lg font-semibold text-white">Уровень {progression.currentLevel}</div>
          <div className="mt-1 text-sm text-slate-300">
            {mode === 'xp' && progression.nextLevelXp
              ? `${progression.currentXp} / ${progression.nextLevelXp} XP`
              : progression.canLevelUp
                ? 'Milestone открыт мастером'
                : 'Ожидает milestone от мастера'}
          </div>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
          {progression.levelUpState === 'in_progress' ? 'повышение в процессе' : progression.canLevelUp ? 'готов к повышению' : 'отслеживание'}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900/90">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${progressRatio}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
        {mode === 'xp' && progression.nextLevelXp ? (
          <>
            <span>До следующего уровня: {Math.max(0, progression.nextLevelXp - progression.currentXp)} XP</span>
            <span>Следующий порог: {progression.nextLevelXp}</span>
          </>
        ) : (
          <span>В milestone-режиме шкала XP заменена статусом кампании.</span>
        )}
      </div>
    </div>
  );
}
