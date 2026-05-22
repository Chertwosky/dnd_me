import Link from 'next/link';
import { Header } from '@/components/header';
import { Badge, LinkButton, Panel } from '@/components/ui';

const implementedNow = [
  {
    title: 'Стол в браузере',
    description:
      'Карта, сетка, токены, туман войны, инициатива, журнал и сохранение сцены в JSON уже доступны.',
  },
  {
    title: 'Персонажи и рост',
    description:
      'Импорт JSON-листа, ручное заполнение, ресурсы героя и встроенный путь повышения уровня.',
  },
  {
    title: 'Мастерская сцены',
    description:
      'Лут, события, скрытая карта мастера, NPC-спавн и быстрые панели собраны вокруг подготовки сцены.',
  },
];

const sessionFlow = [
  'Мастер открывает комнату, задает пароль и готовит сцену.',
  'Игроки входят по ссылке, выбирают персонажа или загружают JSON.',
  'За столом видны карта, туман, инициатива, броски, события и журнал.',
  'После сессии состояние можно сохранить локально и перенести JSON-файлом.',
];

const roleCards = [
  {
    title: 'Мастер',
    text: 'Управляет двумя слоями карты, видимостью, существами, лутом, событиями и раскладкой рабочих панелей.',
  },
  {
    title: 'Игрок',
    text: 'Видит только нужное, редактирует свой лист, бросает кости, следит за инициативой и прогрессией.',
  },
  {
    title: 'Наблюдатель',
    text: 'Подключается без листа персонажа, чтобы смотреть сцену и ход партии в режиме только чтения.',
  },
];

const nextMilestones = [
  'Быстрый поиск по базе знаний в правой панели комнаты.',
  'Lobby-поток со списком участников перед входом на карту.',
  'Реалтайм-синхронизация поверх текущего local-first режима.',
];

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <Header />

      <main className="mx-auto max-w-7xl space-y-16 px-6 py-12 md:py-16">
        <section className="relative grid gap-8 overflow-hidden rounded-4xl border border-white/10 bg-panel-sheen bg-ink-950/70 p-8 shadow-arcane-panel lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:p-10">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rune-400/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-ember-400/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative">
            <Badge tone="ember">Dark fantasy virtual tabletop</Badge>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-parchment-100 md:text-6xl">
              Стол для D&D-сессии, где мастерская не мешает самой игре.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              Arcane Table собирает карту, токены, персонажей, инициативу, журнал и инструменты мастера в один атмосферный рабочий экран. Сейчас это local-first демо, которое уже можно открыть и провести пробную сцену.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/rooms/demo-room">
                <LinkButton tone="primary">Открыть демо-стол</LinkButton>
              </Link>
              <a href="#flow">
                <LinkButton tone="secondary">Посмотреть сценарий</LinkButton>
              </a>
            </div>
          </div>

          <Panel className="relative">
            <div className="eyebrow">Быстрый старт</div>
            <ol className="mt-5 space-y-4 text-sm text-slate-200">
              {sessionFlow.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ember-300/30 bg-ember-400/10 text-xs font-semibold text-ember-200">
                    {index + 1}
                  </span>
                  <span className="leading-6">{step}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </section>

        <section id="flow" className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <Badge tone="rune">Сценарий сессии</Badge>
            <h2 className="mt-4 section-title">От входа до финального сохранения</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Редизайн ведет пользователя через понятные роли и рабочие режимы, а не бросает в плотный экран с десятками кнопок.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {sessionFlow.map((step, index) => (
              <Panel key={step} className="p-4">
                <div className="text-sm font-semibold text-ember-200">Шаг {index + 1}</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step}</p>
              </Panel>
            ))}
          </div>
        </section>

        <section id="roles" className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge tone="arcane">Роли за столом</Badge>
              <h2 className="mt-4 section-title">Один стол, разные уровни шума</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              Мастер получает cockpit, игрок — чистый игровой экран, наблюдатель — безопасный просмотр без лишних прав.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {roleCards.map((item) => (
              <Panel key={item.title} title={item.title} description={item.text} className="p-5" />
            ))}
          </div>
        </section>

        <section id="implemented" className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div>
              <Badge tone="success">Работает сейчас</Badge>
              <h2 className="mt-4 section-title">Функции, которые можно проверить в демо</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              {implementedNow.map((item) => (
                <Panel key={item.title} title={item.title} description={item.description} className="p-5" />
              ))}
            </div>
          </div>

          <Panel eyebrow="Следующий приоритет" title="Что просится после UI-редизайна">
            <ul className="space-y-3 text-sm leading-6 text-slate-200">
              {nextMilestones.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-rune-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      </main>
    </div>
  );
}
