import Link from 'next/link';
import { Header } from '@/components/header';
import { productHighlights, roadmap } from '@/lib/mock-data';

const roomFlow = [
  {
    title: '1. Первый вход',
    description: 'Первый участник задаёт пароль комнаты, получает роль мастера и открывает полный набор инструментов сцены.',
  },
  {
    title: '2. Подключение группы',
    description: 'Остальные входят по тому же паролю как игроки, без отдельного сценария для demo-режима.',
  },
  {
    title: '3. Подготовка персонажей',
    description: 'Игроки создают лист вручную или импортируют JSON из Long Story Short прямо внутри комнаты.',
  },
  {
    title: '4. Ведение сессии',
    description: 'Мастер управляет публичной и скрытой картой, токенами, инициативой, лутом, событиями и журналом.',
  },
];

const gmPanels = [
  'публичная и скрытая карта мастера',
  'слои terrain / obstacle / texture / furniture',
  'fog of war и радиус обзора игроков',
  'инициатива по всем, видимым или только игрокам',
  'генерация лута и сцен со ссылками на dnd.su',
  'JSON-экспорт и сохранённые карты сцен',
];

const playerPanels = [
  'быстрый вход по паролю комнаты',
  'ручное создание листа персонажа',
  'импорт JSON из Long Story Short',
  'управление своим токеном на тактической карте',
  'просмотр общей карты и видимых инициатив',
  'доступ к карточкам всей группы внутри комнаты',
];

const roomStats = [
  { value: '2', label: 'карты в одной сцене', note: 'публичная для игроков и скрытая для мастера' },
  { value: '7', label: 'инструментов рисования', note: 'перемещение, terrain, obstacle, texture, furniture, fog, erase' },
  { value: '3', label: 'способа старта инициативы', note: 'все токены, только видимые, только игроки' },
  { value: 'JSON', label: 'готов для импорта/экспорта', note: 'карты и персонажи можно переносить между сессиями' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <span className="badge">Лицевая страница синхронизирована с game room flow</span>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
                Онлайн-стол для DnD, где одна комната уже включает карту, листы персонажей и инструменты мастера.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-300">
                Эта страница теперь описывает именно тот сценарий, который реализован в <code>components/game-room-page.tsx</code>: вход по паролю,
                автоматическое разделение ролей мастер/игрок, ручное создание и JSON-импорт персонажей, двухслойную карту, инициативу,
                fog of war, журнал и блок быстрых ссылок на dnd.su.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/rooms/demo-room"
                className="rounded-full bg-fuchsia-500 px-6 py-3 font-medium text-white shadow-lg shadow-fuchsia-500/20 transition hover:bg-fuchsia-400"
              >
                Открыть игровую комнату
              </Link>
              <a
                href="#room-flow"
                className="rounded-full border border-white/15 px-6 py-3 font-medium text-slate-100 transition hover:border-cyan-400/50 hover:text-white"
              >
                Как работает комната
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {productHighlights.map((highlight) => (
                <div key={highlight} className="card p-4 text-sm leading-6 text-slate-200">
                  {highlight}
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden border-fuchsia-500/20 bg-slate-950/80">
            <div className="border-b border-white/10 px-6 py-4">
              <p className="text-sm font-medium text-fuchsia-300">Что уже есть в текущей игровой комнате</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {roomStats.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <div className="text-3xl font-semibold text-white">{item.value}</div>
                  <div className="mt-2 text-sm font-medium text-cyan-300">{item.label}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="room-flow" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10 space-y-3">
            <span className="badge">Сценарий входа</span>
            <h2 className="section-title">Лендинг теперь повторяет реальную механику комнаты</h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-300">
              Вместо абстрактного MVP-описания — пошаговый поток, который уже заложен в игровой странице: от первого входа мастера до ведения боя и сохранения сцены.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {roomFlow.map((step) => (
              <div key={step.title} className="card p-6">
                <div className="text-sm font-medium text-fuchsia-300">{step.title}</div>
                <p className="mt-4 text-base leading-7 text-slate-200">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div className="space-y-3">
              <span className="badge">Роли и интерфейсы</span>
              <h2 className="section-title">Что видит мастер и что получает игрок</h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-8">
              <span className="badge">Для мастера</span>
              <h3 className="mt-4 text-2xl font-semibold text-white">Управление сценой, картами и темпом боя</h3>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-300">
                {gmPanels.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-8">
              <span className="badge">Для игрока</span>
              <h3 className="mt-4 text-2xl font-semibold text-white">Быстрый вход, персонаж и контроль своего токена</h3>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-300">
                {playerPanels.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="systems" className="mx-auto grid max-w-7xl gap-6 px-6 py-16 xl:grid-cols-3">
          {[
            {
              title: 'Тактическая карта',
              text: 'Публичная карта показывает только то, что должны видеть игроки: публичные слои, fog of war и обзор от их токенов. Скрытая карта остаётся рабочей областью мастера для засад, ловушек и будущих сцен.',
            },
            {
              title: 'Персонажи и импорт',
              text: 'Внутри комнаты можно создавать полноценные листы персонажей, редактировать характеристики, привязывать лист к токену, загружать аватар и импортировать JSON из Long Story Short.',
            },
            {
              title: 'Темп сессии',
              text: 'Журнал, броски кубов, автогенерация инициативы, генератор лута и случайных событий делают игровую комнату не только картой, но и рабочей панелью ведущего.',
            },
          ].map((feature) => (
            <div key={feature.title} className="card p-6">
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">{feature.text}</p>
            </div>
          ))}
        </section>

        <section id="roadmap" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 space-y-3">
            <span className="badge">Дальше по плану</span>
            <h2 className="section-title">Roadmap сохранён, но теперь подан через текущую реализацию</h2>
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
