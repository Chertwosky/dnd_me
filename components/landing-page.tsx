import Link from 'next/link';
import { Header } from '@/components/header';

const implementedNow = [
  {
    title: 'Игровая комната в браузере',
    description:
      'Карта, сетка, токены, fog of war, инициатива, журнал и сохранение состояния комнаты в JSON уже доступны.',
  },
  {
    title: 'Карточки персонажей и прогрессия',
    description:
      'Импорт JSON-листа, ручное заполнение, ресурсы персонажа и встроенный flow прокачки на основе XP.',
  },
  {
    title: 'Инструменты мастера',
    description:
      'Лут по таблицам, случайные события, скрытая карта мастера, NPC-спавн и быстрые панели управления.',
  },
];

const justAdded = [
  'Понятный вход в комнату: мастер / игрок / наблюдатель (spectator).',
  'Invite-ссылка копируется одной кнопкой прямо из комнаты.',
  'Главная страница теперь показывает реальные сценарии запуска, а не абстрактный roadmap.',
];

const nextMilestones = [
  'Поиск по базе знаний (классы, расы, заклинания, монстры, предметы) в правой панели комнаты.',
  'Лёгкий lobby-поток перед входом в карту: список участников и быстрый выбор персонажа.',
  'Реалтайм-синхронизация комнаты между несколькими браузерами через backend.',
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl space-y-14 px-6 py-12 md:py-16">
        <section className="grid gap-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="badge">D&D virtual tabletop</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Здесь можно сразу провести сессию, а не читать абстрактное описание проекта.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              Главная страница переформатирована как практичный старт: что уже работает, что недавно добавлено и что будет следующим шагом.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/rooms/demo-room"
                className="rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-fuchsia-400"
              >
                Открыть демо-комнату
              </Link>
              <a
                href="#implemented"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-slate-100 transition hover:border-cyan-400/50 hover:text-white"
              >
                Что уже работает
              </a>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Быстрый старт</div>
            <ol className="mt-4 space-y-3 text-sm text-slate-200">
              <li>1) Откройте демо-комнату.</li>
              <li>2) Выберите роль: мастер, игрок или наблюдатель.</li>
              <li>3) Для игрока — создайте/импортируйте лист персонажа.</li>
              <li>4) Начните сцену: карта, токены, броски, события, журнал.</li>
            </ol>
          </div>
        </section>

        <section id="implemented" className="space-y-5">
          <h2 className="section-title">Что реально реализовано сейчас</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {implementedNow.map((item) => (
              <article key={item.title} className="card p-5">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="card p-6">
            <span className="badge">Сделано в этом редизайне</span>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
              {justAdded.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="card p-6">
            <span className="badge">Следующий приоритет</span>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
              {nextMilestones.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-cyan-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
