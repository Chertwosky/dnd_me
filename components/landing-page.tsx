import Link from 'next/link';
import { Header } from '@/components/header';
import { productHighlights, roadmap } from '@/lib/mock-data';

const heroMetrics = [
  { label: 'Роли в комнате', value: 'GM + Players', note: 'Первый вход получает контроль мастера, остальные присоединяются как игроки.' },
  { label: 'Карты в сцене', value: '2 слоя обзора', note: 'Публичная карта видна всем, скрытая — только мастеру.' },
  { label: 'Добавление героя', value: 'Manual / JSON', note: 'Лист можно заполнить с нуля или импортировать из Long Story Short.' },
];

const roomFlow = [
  {
    step: '01',
    title: 'Создать комнату и задать пароль',
    description:
      'Главная страница теперь подводит к тому же room flow, что и интерфейс комнаты: пароль создаётся на первом входе и становится общей точкой доступа для партии.',
  },
  {
    step: '02',
    title: 'Выбрать роль без лишних экранов',
    description:
      'Мастер попадает в админ-панель, игрок — в сценарий добавления персонажа. Это повторяет фактическое поведение `game-room-page.tsx`.',
  },
  {
    step: '03',
    title: 'Играть на тактической и региональной карте',
    description:
      'На лендинге сразу показано, что комната объединяет battle map, fog of war, токены, журнал и рядом стоящий regional widget.',
  },
];

const cockpitCards = [
  {
    title: 'Панель мастера',
    accent: 'bg-fuchsia-400',
    items: ['пароль комнаты', 'слои terrain / obstacle / texture / furniture', 'скрытая карта мастера', 'сохранённые сцены и экспорт'],
  },
  {
    title: 'Поток игрока',
    accent: 'bg-cyan-400',
    items: ['вход по тому же паролю', 'ручной лист персонажа', 'импорт JSON longstoryshort.app', 'управление токеном и листом'],
  },
];

const masterActions = [
  'создать комнату, задать пароль и автоматически стать мастером',
  'загрузить карту и рисовать отдельными слоями: покрытие, препятствия, текстуры, мебель',
  'масштабировать тактическую карту прямо в интерфейсе',
  'запускать случайные события и лут с привязкой к dnd.su',
  'держать рядом виджет карты реальной местности для региональной навигации',
];

const playerActions = [
  'войти в комнату по тому же паролю и автоматически стать игроком',
  'создать лист персонажа вручную прямо в комнате',
  'или загрузить JSON с longstoryshort.app/digital characters',
  'управлять своим токеном и править свой лист',
  'видеть тактическую карту и региональный виджет одновременно',
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:py-20">
          <div className="space-y-8">
            <span className="badge">Главная страница синхронизирована с логикой комнаты</span>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
                Лицевая страница теперь объясняет тот же D&amp;D room flow, который уже работает внутри комнаты.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-300">
                Вместо абстрактного MVP-описания главная ведёт пользователя в тот же сценарий, что и{' '}
                <code className="rounded bg-white/5 px-2 py-1 text-base text-slate-100">components/game-room-page.tsx</code>:
                один пароль, две роли, battle map с zoom и fog, ручное создание персонажа или импорт JSON, плюс инструменты мастера для событий, лута и скрытых сцен.
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
                href="#features"
                className="rounded-full border border-white/15 px-6 py-3 font-medium text-slate-100 transition hover:border-cyan-400/50 hover:text-white"
              >
                Посмотреть структуру
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="card p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{metric.label}</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{metric.value}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{metric.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden border-fuchsia-500/20 bg-slate-950/80">
            <div className="border-b border-white/10 px-6 py-4">
              <p className="text-sm font-medium text-fuchsia-300">Превью комнаты</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Та же структура, что внутри game room</h2>
            </div>

            <div className="space-y-5 p-6 text-sm text-slate-200">
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Комната / demo-room</div>
                    <div className="mt-2 text-lg font-semibold text-white">Одна комната, один пароль, две роли</div>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">Live flow</div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {cockpitCards.map((card) => (
                    <div key={card.title} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${card.accent}`} />
                        <div className="font-medium text-white">{card.title}</div>
                      </div>
                      <ul className="mt-4 space-y-2 text-slate-300">
                        {card.items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/40" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {productHighlights.map((highlight) => (
                  <div key={highlight} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 leading-6 text-slate-200">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div className="space-y-3">
              <span className="badge">Room flow</span>
              <h2 className="section-title">Главная повторяет ключевые шаги сценария комнаты</h2>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="card p-6">
              <div className="text-sm text-slate-400">Как пользователь проходит путь</div>
              <div className="mt-6 space-y-5">
                {roomFlow.map((item) => (
                  <div key={item.step} className="flex gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-sm font-semibold text-fuchsia-300">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  title: 'Комната и доступ',
                  items: ['создание и проверка пароля', 'автоматическое определение роли', 'единая точка входа для всей партии'],
                },
                {
                  title: 'Тактическая сцена',
                  items: ['две карты: публичная и скрытая', 'zoom, fog of war и токены', 'сеточное поле с гибким размером'],
                },
                {
                  title: 'Персонажи',
                  items: ['ручное создание листа', 'импорт из longstoryshort.app', 'редактирование характеристик, инвентаря и заметок'],
                },
                {
                  title: 'Инструменты мастера',
                  items: ['слои карты и палитры', 'сцены, экспорт и сохранения', 'лут, события и журнал сессии'],
                },
              ].map((feature) => (
                <div key={feature.title} className="card p-6">
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    {feature.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="scenarios" className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-2">
          <div className="card p-8">
            <span className="badge">Для мастера</span>
            <h2 className="mt-4 text-2xl font-semibold text-white">Тактический и региональный контроль</h2>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-300">
              {masterActions.map((action) => (
                <li key={action} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-8">
            <span className="badge">Для игрока</span>
            <h2 className="mt-4 text-2xl font-semibold text-white">Быстрый вход и импорт персонажа</h2>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-300">
              {playerActions.map((action) => (
                <li key={action} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="roadmap" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 space-y-3">
            <span className="badge">Roadmap</span>
            <h2 className="section-title">Этапы развития поверх уже работающего сценария</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {roadmap.map((phase) => (
              <div key={phase.title} className="card p-6">
                <h3 className="text-lg font-semibold text-white">{phase.title}</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {phase.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
