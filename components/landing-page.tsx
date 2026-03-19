import Link from 'next/link';
import { Header } from '@/components/header';
import { productHighlights, roadmap } from '@/lib/mock-data';

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
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <span className="badge">Игровой стол + мастерская мастера • password room flow</span>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
                Одна комната с паролем, тактической картой, импортом персонажей и regional map widget.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Вместо отдельной демо-комнаты теперь используется обычная комната: первый вход задаёт пароль и становится мастером, следующие участники заходят как игроки. Игрок может заполнить лист в интерфейсе или загрузить JSON с Long Story Short, а мастер получает масштабируемую карту со слоями препятствий, текстур и мебели.
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
                'Вход в комнату по паролю',
                'Первый вход = мастер, остальные = игроки',
                'Ручное создание листа персонажа',
                'Импорт JSON с Long Story Short',
                'Масштабируемая battle map',
                'Рисование препятствий, текстур и столов',
                'Лут и события со ссылкой на dnd.su',
                'Виджет карты местности рядом со сценой',
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
              <h2 className="section-title">Функциональность под новый room flow</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: 'Комната и роли',
                items: ['пароль комнаты', 'первый вход становится мастером', 'следующие входы получают роль игрока'],
              },
              {
                title: 'Игровое поле',
                items: ['масштабирование карты', 'слои terrain / obstacle / texture / furniture', 'токены и fog of war'],
              },
              {
                title: 'Карточки персонажей',
                items: ['ручное создание листа', 'JSON import с Long Story Short', 'редактирование характеристик'],
              },
              {
                title: 'Инструменты мастера',
                items: ['dice roller', 'лут c dnd.su', 'события c dnd.su', 'виджет региональной карты'],
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
