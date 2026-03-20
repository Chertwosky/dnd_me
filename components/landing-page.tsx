import Link from 'next/link';
import { Header } from '@/components/header';

const shippedCapabilities = [
  'Комнаты с ролями мастер/игрок и password flow без отдельного lobby.',
  'Тактическая карта с сеткой, token movement, zoom, fog of war и слоями карты.',
  'JSON import/export, сохранение сцен и отдельная скрытая карта мастера.',
  'Dice roller, журнал сессии, ссылки на dnd.su и базовые инструменты для ведения игры.',
  'Трекер инициативы, порядок ходов и переход к следующему ходу прямо в комнате.',
];

const priorityTiers = [
  {
    title: 'Tier 1 · максимум пользы / минимум риска',
    accent: 'border-emerald-400/30 bg-emerald-500/10',
    description:
      'Опираемся на уже существующие токены, карточки персонажей и журнал. Эти фичи дают моментальный прирост качества боя и не требуют переписывать архитектуру.',
    items: [
      'Статусы и эффекты на токенах.',
      'Броски / атаки / спасброски из карточки персонажа в 1 клик.',
      'Трекер ресурсов персонажа: spell slots, hit dice, rage, ki, sorcery points, death saves, exhaustion.',
      'Сцены как более полноценные пресеты без поломки текущего JSON.',
    ],
  },
  {
    title: 'Tier 2 · сильное усиление мастерского UX',
    accent: 'border-cyan-400/30 bg-cyan-500/10',
    description:
      'Усиливаем мастерскую панель поверх существующих room/token/journal state, не ломая flow для игроков.',
    items: [
      'Поле диалогового NPC и быстрый режим монстров/NPC.',
      'Секретные заметки, триггеры и скрытые события на клетках карты мастера.',
      'AoE-шаблоны и измерение дистанции.',
      'Undo / история действий для карты, токенов и инициативы.',
    ],
  },
  {
    title: 'Tier 3 · расширение экосистемы',
    accent: 'border-fuchsia-400/30 bg-fuchsia-500/10',
    description:
      'Эти задачи важны, но их лучше делать после укрепления core loop комнаты.',
    items: [
      'LLM-подсказки для мастера: реплики NPC, слухи, лут, мотивация и стиль речи.',
      'Журнал сессии с автосаммари.',
      'Прокачка персонажа со ссылками на релевантные механики dnd.su.',
      'Мобильный UX для игроков и более гибкие роли/права доступа.',
    ],
  },
];

const sprintRoadmap = [
  {
    title: 'Sprint 1',
    goal: 'Укрепить боевой loop без миграции архитектуры.',
    features: ['статусы/эффекты на токенах', 'one-click roll actions из карточки', 'ресурсы персонажа v1'],
    changes: ['расширение `RoomToken` и `CharacterSheet` опциональными полями', 'локальные UI-панели в `game-room-page.tsx`', 'журналирование действий в существующий `journal`'],
    compatibility: 'Все новые поля опциональны; старые комнаты и JSON читаются без миграции, недостающие значения нормализуются на клиенте.',
  },
  {
    title: 'Sprint 2',
    goal: 'Сделать мастерскую комнату центром управления сценой.',
    features: ['NPC dialogue field', 'быстрый режим монстров/NPC', 'секретные триггеры на клетках', 'AoE и measurement'],
    changes: ['добавление метаданных к сценам и клеткам GM-карты', 'новые панели мастера без изменения player flow', 'минимальное расширение JSON экспорта сцен'],
    compatibility: 'Секретные сущности хранятся как новые optional-поля; отсутствие этих блоков трактуется как “фича не настроена”.',
  },
  {
    title: 'Sprint 3',
    goal: 'Добавить AI и долгую поддержку кампании.',
    features: ['LLM-подсказки мастеру', 'автосаммари журнала', 'прокачка персонажей через dnd.su', 'гибкие права и mobile UX polish'],
    changes: ['тонкий сервисный слой для AI-запросов', 'расширение журнала служебными summary entries', 'UI-режимы для игроков на мобильных'],
    compatibility: 'AI-функции проектируются как необязательные enhancement-блоки; core loop комнаты продолжает работать офлайн и без внешних сервисов.',
  },
];

const bestFirstFeature = {
  title: 'Статусы и эффекты на токенах',
  why: [
    'Инициатива уже реализована, поэтому статусы сразу усиливают существующий бой, а не создают параллельную систему.',
    'Эта фича почти не требует новых сущностей: достаточно расширить токен и добавить UI-слой поверх текущей карты и панели токенов.',
    'Статусы — база для следующих этапов: one-click rolls, ресурсы, NPC-боёвка, undo и AI-подсказки смогут на них опираться.',
  ],
  architecture: [
    'Data model: добавить в `RoomToken` опциональное поле `statuses?: TokenStatusKey[]`.',
    'State management: хранить статусы в том же `tokens` state, что уже сохраняется в localStorage и JSON комнаты.',
    'UI: дать мастеру быстрые toggle-кнопки в панели токенов и визуальные бейджи у токенов на карте.',
    'Backward compatibility: при загрузке старых комнат нормализовать отсутствие `statuses` в пустой массив.',
  ],
  edgeCases: [
    'Старые JSON без статусов должны открываться без ошибок.',
    'Объекты окружения не обязаны поддерживать эффекты так же, как существа.',
    'Скрытые GM-токены не должны внезапно раскрывать статусы игрокам.',
    'Повторное добавление статуса не должно дублировать запись; нужен dedupe.',
  ],
  implementation: [
    'Шаг 1: ввести типы статусов и нормализацию данных.',
    'Шаг 2: добавить UI-переключатели статусов в секцию токенов мастера.',
    'Шаг 3: отрисовать краткие маркеры статусов прямо на токенах карты.',
    'Шаг 4: сохранить всё в текущий JSON/export flow без обязательной миграции.',
    'Шаг 5: опереться на эту модель в следующем спринте для бросков и ресурсов.',
  ],
};

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:py-20">
          <div className="space-y-8">
            <span className="badge">D&amp;D session hub: текущее состояние + следующий этап развития</span>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
                Сайт уже умеет вести сессию. Следующий этап — превратить его в полноценный центр управления D&amp;D-партией.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-300">
                На главной теперь показано не старое MVP-описание, а реальная картина продукта: что уже работает в комнате, какие фичи дают максимальную пользу дальше и как разбить развитие на 3 incremental sprint без поломки текущих комнат, сцен и JSON-совместимости.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/rooms/demo-room"
                className="rounded-full bg-fuchsia-500 px-6 py-3 font-medium text-white shadow-lg shadow-fuchsia-500/20 transition hover:bg-fuchsia-400"
              >
                Открыть комнату
              </Link>
              <a
                href="#roadmap"
                className="rounded-full border border-white/15 px-6 py-3 font-medium text-slate-100 transition hover:border-cyan-400/50 hover:text-white"
              >
                Посмотреть roadmap
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="card p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Уже работает</div>
                <div className="mt-3 text-2xl font-semibold text-white">Core session loop</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Комната, карта, токены, fog, инициатива, сцены, JSON и базовые мастерские инструменты.</p>
              </div>
              <div className="card p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Следующий приоритет</div>
                <div className="mt-3 text-2xl font-semibold text-white">Combat UX</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Статусы, быстрые броски и ресурсы дают наибольший прирост без смены архитектуры.</p>
              </div>
              <div className="card p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Подход</div>
                <div className="mt-3 text-2xl font-semibold text-white">Incremental</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Новые поля остаются optional, а старые комнаты и экспорт продолжают открываться без миграций.</p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden border-fuchsia-500/20 bg-slate-950/80">
            <div className="border-b border-white/10 px-6 py-4">
              <p className="text-sm font-medium text-fuchsia-300">Что уже сделано</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Текущий продуктовый baseline</h2>
            </div>

            <div className="space-y-3 p-6 text-sm text-slate-200">
              {shippedCapabilities.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 leading-6">
                  <span className="mt-2 h-2 w-2 rounded-full bg-cyan-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 space-y-3">
            <span className="badge">Priority tiers</span>
            <h2 className="section-title">Какие фичи делать следующими и почему</h2>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {priorityTiers.map((tier) => (
              <div key={tier.title} className={`card p-6 ${tier.accent}`}>
                <h3 className="text-xl font-semibold text-white">{tier.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-200">{tier.description}</p>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-100">
                  {tier.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/80" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="roadmap" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 space-y-3">
            <span className="badge">3-sprint roadmap</span>
            <h2 className="section-title">Пошаговый план развития без поломки текущего UX</h2>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {sprintRoadmap.map((sprint) => (
              <div key={sprint.title} className="card p-6">
                <div className="text-sm text-slate-400">{sprint.title}</div>
                <h3 className="mt-2 text-2xl font-semibold text-white">{sprint.goal}</h3>

                <div className="mt-5 space-y-4 text-sm text-slate-300">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Фичи</div>
                    <ul className="space-y-2">
                      {sprint.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Изменения в модели / state / UI</div>
                    <ul className="space-y-2">
                      {sprint.changes.map((change) => (
                        <li key={change} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 leading-6 text-slate-200">
                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Совместимость</div>
                    {sprint.compatibility}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="scenarios" className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="card p-8">
            <span className="badge">Best first feature</span>
            <h2 className="mt-4 text-2xl font-semibold text-white">{bestFirstFeature.title}</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Почему именно она</div>
                <ul className="space-y-2">
                  {bestFirstFeature.why.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Архитектура</div>
                <ul className="space-y-2">
                  {bestFirstFeature.architecture.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="card p-8">
            <span className="badge">Technical design</span>
            <h2 className="mt-4 text-2xl font-semibold text-white">Edge cases и пошаговое внедрение</h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">Edge cases</div>
                <ul className="space-y-2 text-sm leading-6 text-slate-300">
                  {bestFirstFeature.edgeCases.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">Implementation plan</div>
                <ol className="space-y-3 text-sm leading-6 text-slate-300">
                  {bestFirstFeature.implementation.map((item, index) => (
                    <li key={item} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">{index + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
