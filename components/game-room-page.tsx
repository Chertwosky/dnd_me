import Link from 'next/link';
import {
  characterSheets,
  chatMessages,
  eventTables,
  fogZones,
  initiativeOrder,
  journal,
  knowledgeBase,
  lootResults,
  phaseChecklist,
  randomEvents,
  roomMembers,
  roomStats,
  tokens,
} from '@/lib/mock-data';

function PhaseOverview() {
  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Покрытие roadmap</h2>
          <p className="text-sm text-slate-400">Все этапы сведены в один демонстрационный рабочий экран.</p>
        </div>
        <span className="badge">4 / 4 этапа</span>
      </div>

      <div className="space-y-4">
        {phaseChecklist.map((phase) => (
          <div key={phase.title} className="rounded-3xl border border-white/8 bg-slate-950/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-white">{phase.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{phase.summary}</p>
              </div>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                done
              </span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {phase.items.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 px-3 py-2 text-sm text-slate-200">
                  <span className="mr-2 text-emerald-300">✓</span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GridMap() {
  const cells = Array.from({ length: 64 }, (_, index) => index);

  return (
    <div className="card relative overflow-hidden p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
        <div>
          <p className="font-medium text-white">Карта: Руины старой башни</p>
          <p>Слой: карта / объекты / заметки / fog of war / initiative hints</p>
        </div>
        <div className="flex gap-2">
          <span className="badge">Grid 70 px</span>
          <span className="badge">125%</span>
          <span className="badge">Distance tool</span>
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
        <div className="absolute left-[58%] top-[20%] flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-400/20 text-xs font-semibold text-emerald-100 shadow-lg shadow-emerald-500/20">
          W
        </div>
        <div className="absolute left-[82%] top-[66%] flex h-10 w-10 items-center justify-center rounded-xl border-2 border-violet-300 bg-violet-400/20 text-xs font-semibold text-violet-100 shadow-lg shadow-violet-500/20">
          📦
        </div>

        <div className="absolute left-[58%] top-[18%] h-44 w-48 rounded-3xl bg-slate-950/65 ring-1 ring-white/10 backdrop-blur-sm" />
        <div className="absolute bottom-[14%] left-[6%] h-24 w-28 rounded-[2rem] border border-dashed border-cyan-400/30 bg-cyan-500/5" />
        <div className="absolute right-[6%] top-[8%] rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-100">
          Realtime token sync active
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
        <button className="rounded-full border border-white/10 px-4 py-2">Загрузить карту</button>
        <button className="rounded-full border border-white/10 px-4 py-2">Измерить расстояние</button>
        <button className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-emerald-100">Туман войны</button>
        <button className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-2 text-fuchsia-100">
          Перемещение токенов realtime
        </button>
      </div>
    </div>
  );
}

function CharacterCard() {
  const sheet = characterSheets[0];

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold text-white">Карточка персонажа</h2>
      <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/8 p-4 text-sm text-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{sheet.name}</div>
            <div className="text-slate-400">{sheet.subtitle}</div>
          </div>
          <span className="badge">{sheet.owner}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-2xl bg-slate-950/70 p-3"><div className="text-slate-400">HP</div><div className="mt-1 text-base font-semibold text-white">{sheet.hp}</div></div>
          <div className="rounded-2xl bg-slate-950/70 p-3"><div className="text-slate-400">AC</div><div className="mt-1 text-base font-semibold text-white">{sheet.ac}</div></div>
          <div className="rounded-2xl bg-slate-950/70 p-3"><div className="text-slate-400">Speed</div><div className="mt-1 text-base font-semibold text-white">{sheet.speed}</div></div>
        </div>
        <div className="mt-4 text-slate-300">Stats: {sheet.stats}</div>
        <div className="mt-4 rounded-2xl bg-slate-950/60 p-3 text-slate-300">
          <div className="text-xs uppercase tracking-wide text-slate-400">Спеллы</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sheet.spells.map((spell) => (
              <span key={spell} className="badge">{spell}</span>
            ))}
          </div>
        </div>
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
            <h1 className="text-2xl font-semibold text-white">Playable room MVP · все этапы roadmap</h1>
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {roomStats.map((stat) => (
            <div key={stat.label} className="card p-4">
              <div className="text-sm text-slate-400">{stat.label}</div>
              <div className="mt-2 text-xl font-semibold text-white">{stat.value}</div>
            </div>
          ))}
        </section>

        <PhaseOverview />

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="space-y-4">
            <div className="card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Участники</h2>
                <span className="badge">4 online</span>
              </div>
              <div className="space-y-3 text-sm">
                {roomMembers.map((member) => (
                  <div key={member.name} className="rounded-2xl border border-white/8 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-white">{member.name}</div>
                        <div className="text-slate-400">{member.role} • {member.character}</div>
                      </div>
                      <span className="text-xs text-cyan-300">{member.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Токены</h2>
                <span className="badge">authority server</span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {tokens.map((token) => (
                  <div key={token.name} className="rounded-2xl border border-white/8 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{token.name}</div>
                      <div className="text-slate-400">{token.x}</div>
                    </div>
                    <div className="mt-1 text-slate-400">{token.owner} • {token.type}</div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                      <span>HP {token.hp}</span>
                      <span>AC {token.ac}</span>
                      <span>{token.movement}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Инициатива</h2>
                <span className="badge">round 3</span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {initiativeOrder.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between rounded-2xl border border-white/8 px-3 py-3 text-slate-200">
                    <div>
                      <div className="font-medium text-white">{entry.name}</div>
                      <div className="text-xs text-slate-400">{entry.state}</div>
                    </div>
                    <div className="text-lg font-semibold text-fuchsia-200">{entry.score}</div>
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

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Чат</h2>
                  <span className="text-sm text-slate-400">Команды: /roll, /w, /loot</span>
                </div>
                <div className="space-y-3 text-sm">
                  {chatMessages.map((message) => (
                    <div key={`${message.time}-${message.author}`} className="rounded-2xl border border-white/8 px-4 py-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{message.author}</span>
                        <span>{message.time}</span>
                      </div>
                      <p className="mt-2 text-slate-200">{message.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Журнал сессии</h2>
                  <span className="text-sm text-slate-400">broadcast to room</span>
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
            </div>
          </main>

          <aside className="space-y-4">
            <div className="card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Справка</h2>
                <span className="badge">5+ сущностей</span>
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

            <CharacterCard />

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Генератор лута</h2>
                <span className="badge">custom tables</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {lootResults.map((item) => (
                  <div key={`${item.name}-${item.target}`} className="rounded-2xl border border-white/8 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{item.name}</span>
                      <span className="text-xs text-amber-300">{item.rarity}</span>
                    </div>
                    <div className="mt-1 text-slate-400">{item.quantity} • {item.target}</div>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950">
                Сгенерировать лут
              </button>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Случайные события</h2>
                <span className="badge">weighted</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                {eventTables.map((table) => (
                  <span key={table} className="badge">{table}</span>
                ))}
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {randomEvents.map((event) => (
                  <div key={`${event.scene}-${event.effect}`} className="rounded-2xl border border-white/8 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{event.scene}</span>
                      <span className="text-xs text-fuchsia-300">{event.weight}</span>
                    </div>
                    <div className="mt-1 text-slate-400">{event.effect}</div>
                    <div className="mt-2">{event.text}</div>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full rounded-full bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white">
                Случайное событие
              </button>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Fog of war</h2>
                <span className="badge">GM only</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {fogZones.map((zone) => (
                  <div key={zone.name} className="rounded-2xl border border-white/8 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{zone.name}</span>
                      <span className="text-xs text-emerald-300">{zone.state}</span>
                    </div>
                    <div className="mt-1 text-slate-400">Покрытие: {zone.coverage}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
