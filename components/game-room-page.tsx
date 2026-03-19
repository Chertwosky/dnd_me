import Link from 'next/link';
import { eventTables, journal, knowledgeBase, roomMembers, tokens } from '@/lib/mock-data';

function GridMap() {
  const cells = Array.from({ length: 64 }, (_, index) => index);

  return (
    <div className="card relative overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-300">
        <div>
          <p className="font-medium text-white">Карта: Руины старой башни</p>
          <p>Слой: карта / объекты / заметки / fog of war</p>
        </div>
        <div className="flex gap-2">
          <span className="badge">Grid 70 px</span>
          <span className="badge">125%</span>
        </div>
      </div>

      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.75),rgba(30,41,59,0.95))]" />
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
          {cells.map((cell) => (
            <div key={cell} className="border border-white/8" />
          ))}
        </div>

        <div className="absolute left-[12%] top-[45%] flex h-12 w-12 items-center justify-center rounded-full border-2 border-cyan-300 bg-cyan-400/20 text-sm font-semibold text-cyan-100 shadow-lg shadow-cyan-500/20">
          Э
        </div>
        <div className="absolute left-[24%] top-[56%] flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-300/20 text-sm font-semibold text-amber-100 shadow-lg shadow-amber-500/20">
          Б
        </div>
        <div className="absolute left-[70%] top-[45%] flex h-10 w-10 items-center justify-center rounded-full border-2 border-rose-300 bg-rose-400/20 text-xs font-semibold text-rose-100 shadow-lg shadow-rose-500/20">
          NPC
        </div>
        <div className="absolute left-[82%] top-[66%] flex h-10 w-10 items-center justify-center rounded-xl border-2 border-violet-300 bg-violet-400/20 text-xs font-semibold text-violet-100 shadow-lg shadow-violet-500/20">
          📦
        </div>

        <div className="absolute left-[58%] top-[18%] h-44 w-48 rounded-3xl bg-slate-950/65 ring-1 ring-white/10 backdrop-blur-sm" />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
        <button className="rounded-full border border-white/10 px-4 py-2">Загрузить карту</button>
        <button className="rounded-full border border-white/10 px-4 py-2">Измерить расстояние</button>
        <button className="rounded-full border border-white/10 px-4 py-2">Туман войны</button>
        <button className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-2 text-fuchsia-100">
          Перемещение токенов realtime
        </button>
      </div>
    </div>
  );
}

export function GameRoomPage({ roomId }: { roomId: string }) {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="card flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm text-slate-400">Комната / {roomId}</div>
            <h1 className="text-2xl font-semibold text-white">Лобби + экран игры MVP</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
              На главную
            </Link>
            <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
              Invite-ссылка
            </button>
            <button className="rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-medium text-white">
              Настройки мастера
            </button>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="space-y-4">
            <div className="card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Участники</h2>
                <span className="badge">4 online</span>
              </div>
              <div className="space-y-3 text-sm">
                {roomMembers.map((member) => (
                  <div key={member.name} className="flex items-center justify-between rounded-2xl border border-white/8 px-3 py-3">
                    <div>
                      <div className="font-medium text-white">{member.name}</div>
                      <div className="text-slate-400">{member.role}</div>
                    </div>
                    <span className="text-xs text-cyan-300">{member.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h2 className="text-lg font-semibold text-white">Токены / инициатива</h2>
              <div className="mt-4 space-y-3 text-sm">
                {tokens.map((token) => (
                  <div key={token.name} className="rounded-2xl border border-white/8 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{token.name}</div>
                      <div className="text-slate-400">{token.x}</div>
                    </div>
                    <div className="mt-1 text-slate-400">{token.owner}</div>
                    <div className="mt-2 flex gap-3 text-xs text-slate-300">
                      <span>HP {token.hp}</span>
                      <span>AC {token.ac}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-4">
            <div className="card flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-slate-200">
              <span className="badge">Роль: мастер</span>
              <span className="badge">Realtime: connected</span>
              <span className="badge">Режим: demo session</span>
              <button className="rounded-full border border-white/10 px-4 py-2">Выбрать персонажа</button>
              <button className="rounded-full border border-white/10 px-4 py-2">Открыть лист</button>
              <button className="rounded-full border border-white/10 px-4 py-2">/roll 1d20+5</button>
            </div>

            <GridMap />

            <div className="card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Чат и броски</h2>
                <span className="text-sm text-slate-400">Команды: /roll 1d20+5</span>
              </div>
              <div className="space-y-3 text-sm">
                {journal.map((entry) => (
                  <div key={`${entry.time}-${entry.text}`} className="rounded-2xl border border-white/8 px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{entry.type}</span>
                      <span>{entry.time}</span>
                    </div>
                    <p className="mt-2 text-slate-200">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </main>

          <aside className="space-y-4">
            <div className="card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Справка</h2>
                <span className="badge">dnd.su-style UX</span>
              </div>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Поиск по классам, расам, заклинаниям, монстрам, предметам"
                readOnly
              />
              <div className="mt-4 space-y-3 text-sm">
                {knowledgeBase.map((entry) => (
                  <div key={entry.title} className="rounded-2xl border border-white/8 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-fuchsia-300">{entry.kind}</div>
                    <div className="mt-1 font-medium text-white">{entry.title}</div>
                    <div className="mt-1 text-slate-400">{entry.meta}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h2 className="text-lg font-semibold text-white">Карточка персонажа</h2>
              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/8 p-4 text-sm text-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-white">Элира Найтбриз</div>
                    <div className="text-slate-400">Эльф • Wizard • уровень 4</div>
                  </div>
                  <span className="badge">Владелец</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="rounded-2xl bg-slate-950/70 p-3"><div className="text-slate-400">HP</div><div className="mt-1 text-base font-semibold text-white">28 / 32</div></div>
                  <div className="rounded-2xl bg-slate-950/70 p-3"><div className="text-slate-400">AC</div><div className="mt-1 text-base font-semibold text-white">15</div></div>
                  <div className="rounded-2xl bg-slate-950/70 p-3"><div className="text-slate-400">Speed</div><div className="mt-1 text-base font-semibold text-white">30</div></div>
                </div>
                <div className="mt-4 text-slate-300">
                  Stats: INT 18, DEX 14, CON 12. Спеллы: Magic Missile, Shield, Misty Step.
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div className="card p-4">
                <h2 className="text-lg font-semibold text-white">Генератор лута</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-white/8 px-4 py-3">Редкий • Potion of Healing • x1</div>
                  <div className="rounded-2xl border border-white/8 px-4 py-3">Золото • 34 gp</div>
                </div>
                <button className="mt-4 w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950">
                  Сгенерировать лут
                </button>
              </div>

              <div className="card p-4">
                <h2 className="text-lg font-semibold text-white">Случайные события</h2>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                  {eventTables.map((table) => (
                    <span key={table} className="badge">{table}</span>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 px-4 py-3 text-sm text-slate-300">
                  Лес: «Вы слышите движение в кустах; появляется дружественный следопыт».
                </div>
                <button className="mt-4 w-full rounded-full bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white">
                  Случайное событие
                </button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
