import Link from 'next/link';
import { Header } from '@/components/header';
import { productHighlights, roadmap } from '@/lib/mock-data';

const masterActions = [
  'создать комнату / сессию',
  'загрузить карту',
  'расставить токены игроков и NPC',
  'открывать карточки монстров, предметов и заклинаний',
  'запускать генератор лута и случайные события',
  'вести журнал и управлять туманом войны',
];

const playerActions = [
  'зайти по invite-ссылке',
  'видеть карту и свои токены',
  'двигать только свой токен',
  'открывать лист персонажа',
  'бросать кубы и получать эффекты событий',
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <span className="badge">Игровой стол + мастерская мастера • roadmap 1–4</span>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
                Онлайн-платформа для D&amp;D-сессий с картой, токенами, лутом и встроенной справкой.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                MVP заточен под быстрый старт партии: мастер создаёт комнату, загружает карту,
                двигает NPC, открывает карточки и запускает игровые инструменты прямо во время
                сессии. Демо-версия на текущем этапе уже визуализирует все запланированные фазы
                roadmap — от foundation до fog of war и базы знаний.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/rooms/demo-room"
                className="rounded-full bg-fuchsia-500 px-6 py-3 font-medium text-white shadow-lg shadow-fuchsia-500/20 transition hover:bg-fuchsia-400"
              >
                Открыть демо-комнату
              </Link>
              <a
                href="#features"
                className="rounded-full border border-white/15 px-6 py-3 font-medium text-slate-100 transition hover:border-cyan-400/50 hover:text-white"
              >
                Смотреть возможности
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
              <p className="text-sm font-medium text-fuchsia-300">Что уже покрывает текущее демо</p>
            </div>
            <div className="space-y-4 p-6 text-sm text-slate-200">
              {[
                'Создать комнату',
                'Загрузить карту',
                'Двигать фишки',
                'Открыть карточку персонажа',
                'Бросить кубы',
                'Сгенерировать лут',
                'Вызвать случайное событие',
                'Открыть справку в боковой панели',
                'Управлять инициативой и fog of war',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div className="space-y-3">
              <span className="badge">MVP-функции</span>
              <h2 className="section-title">Функциональность, строго соответствующая спецификации</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: 'Комнаты и роли',
                items: ['invite-ссылки', 'мастер / игрок / наблюдатель', 'права на управление объектами'],
              },
              {
                title: 'Игровое поле',
                items: ['карта и сетка', 'токены персонажей и NPC', 'pan / zoom / distance / fog'],
              },
              {
                title: 'Карточки персонажей',
                items: ['JSON / PDF / изображение', 'HP / AC / speed / stats', 'быстрый просмотр по токену'],
              },
              {
                title: 'Инструменты мастера',
                items: ['dice roller', 'генератор лута', 'случайные события', 'база знаний'],
              },
            ].map((feature) => (
              <div key={feature.title} className="card p-6">
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  {feature.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="scenarios" className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-2">
          <div className="card p-8">
            <span className="badge">Для мастера</span>
            <h2 className="mt-4 text-2xl font-semibold text-white">Быстрое ведение сессии</h2>
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
            <h2 className="mt-4 text-2xl font-semibold text-white">Вход по ссылке и игра без лишних действий</h2>
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
            <span className="badge">План реализации</span>
            <h2 className="section-title">Roadmap на первые этапы разработки</h2>
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
