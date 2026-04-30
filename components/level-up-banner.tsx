import type { CharacterProgression } from '@/lib/level-up';

export function LevelUpBanner({ progression, onOpen }: { progression: CharacterProgression; onOpen: () => void }) {
  if (!progression.canLevelUp && progression.levelUpState !== 'in_progress') return null;
  const inProgress = progression.levelUpState === 'in_progress';
  return (
    <div className={`rounded-3xl border px-4 py-4 ${inProgress ? 'border-ember-300/40 bg-ember-400/10 shadow-ember-glow' : 'border-emerald-400/40 bg-emerald-500/10'}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-parchment-100">{inProgress ? 'Повышение уровня не завершено' : 'Доступно повышение уровня'}</div>
          <div className="mt-1 text-sm text-slate-200">{inProgress ? 'Draft сохранён, можно продолжить с последнего шага.' : 'Порог достигнут, но уровень не повысится без подтверждения игрока.'}</div>
        </div>
        <button type="button" onClick={onOpen} className={`rounded-full px-4 py-2 text-sm font-medium ${inProgress ? 'bg-ember-400 text-ink-950' : 'bg-emerald-400 text-ink-950'}`}>
          {inProgress ? 'Продолжить' : 'Повысить уровень'}
        </button>
      </div>
    </div>
  );
}
