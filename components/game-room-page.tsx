'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';

type RoomToken = {
  id: string;
  name: string;
  short: string;
  kind: 'player' | 'npc' | 'monster' | 'object';
  color: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  owner: string;
  sheetId?: string;
};

type CharacterSheet = {
  id: string;
  tokenId: string;
  name: string;
  race: string;
  heroClass: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  notes: string;
  inventory: string;
  spells: string;
};

type JournalEntry = {
  id: string;
  type: 'system' | 'move' | 'dice' | 'loot' | 'event' | 'sheet' | 'map';
  text: string;
  time: string;
};

const GRID_COLS = 12;
const GRID_ROWS = 8;
const DEFAULT_TILE = '#0f172a';
const palette = ['#0f172a', '#334155', '#14532d', '#1d4ed8', '#92400e', '#7c3aed'];
const randomEventPool = [
  'Лесной дозор замечает костёр и выходит на переговоры.',
  'Скрытая ловушка активируется рядом с алтарём.',
  'Сверху осыпается кладка и открывает тайный проход.',
  'NPC-проводник находит безопасный путь к башне.',
];
const lootPool = ['Potion of Healing', '34 gp', 'Scroll of Shield', 'Silver key', 'Ration pack'];

const initialTokens: RoomToken[] = [
  {
    id: 'elira',
    name: 'Элира',
    short: 'Э',
    kind: 'player',
    color: 'rgb(34 211 238)',
    x: 1,
    y: 3,
    hp: 28,
    maxHp: 32,
    ac: 15,
    speed: 30,
    owner: 'Игрок',
    sheetId: 'sheet-elira',
  },
  {
    id: 'borin',
    name: 'Борин',
    short: 'Б',
    kind: 'player',
    color: 'rgb(251 191 36)',
    x: 3,
    y: 4,
    hp: 41,
    maxHp: 41,
    ac: 18,
    speed: 25,
    owner: 'Игрок',
    sheetId: 'sheet-borin',
  },
  {
    id: 'goblin',
    name: 'Гоблин',
    short: 'G',
    kind: 'monster',
    color: 'rgb(244 63 94)',
    x: 8,
    y: 3,
    hp: 7,
    maxHp: 7,
    ac: 13,
    speed: 30,
    owner: 'GM',
  },
  {
    id: 'chest',
    name: 'Сундук',
    short: '📦',
    kind: 'object',
    color: 'rgb(168 85 247)',
    x: 10,
    y: 5,
    hp: 0,
    maxHp: 0,
    ac: 12,
    speed: 0,
    owner: 'GM',
  },
];

const initialSheets: CharacterSheet[] = [
  {
    id: 'sheet-elira',
    tokenId: 'elira',
    name: 'Элира Найтбриз',
    race: 'Эльф',
    heroClass: 'Wizard',
    level: 4,
    hp: 28,
    maxHp: 32,
    ac: 15,
    speed: 30,
    stats: { str: 8, dex: 14, con: 12, int: 18, wis: 13, cha: 10 },
    notes: 'Ищет скрытый архив башни и избегает ближнего боя.',
    inventory: 'Arcane focus, Potion of Healing, Explorer pack',
    spells: 'Magic Missile, Shield, Misty Step',
  },
  {
    id: 'sheet-borin',
    tokenId: 'borin',
    name: 'Борин Стоунхарт',
    race: 'Дварф',
    heroClass: 'Fighter',
    level: 4,
    hp: 41,
    maxHp: 41,
    ac: 18,
    speed: 25,
    stats: { str: 18, dex: 10, con: 16, int: 9, wis: 12, cha: 8 },
    notes: 'Держит переднюю линию и прикрывает Элиру щитом.',
    inventory: 'Battleaxe, Shield, Rope 50 ft',
    spells: '',
  },
];

const createEmptyMap = () => Array.from({ length: GRID_COLS * GRID_ROWS }, () => DEFAULT_TILE);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nowTime() {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date());
}

function rollFormula(formula: string) {
  const match = formula.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) return null;

  const count = Number(match[1] || 1);
  const sides = Number(match[2]);
  const modifier = Number(match[3] || 0);

  if (count < 1 || count > 20 || sides < 2 || sides > 1000) return null;

  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

  return { count, sides, modifier, rolls, total };
}

function getCellIndex(x: number, y: number) {
  return y * GRID_COLS + x;
}

export function GameRoomPage({ roomId }: { roomId: string }) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [mapName, setMapName] = useState('Руины старой башни');
  const [mapTiles, setMapTiles] = useState<string[]>(createEmptyMap);
  const [fogCells, setFogCells] = useState<boolean[]>(() => Array.from({ length: GRID_COLS * GRID_ROWS }, () => false));
  const [tokens, setTokens] = useState<RoomToken[]>(initialTokens);
  const [sheets, setSheets] = useState<CharacterSheet[]>(initialSheets);
  const [selectedTokenId, setSelectedTokenId] = useState('elira');
  const [tool, setTool] = useState<'move' | 'paint' | 'fog' | 'erase'>('move');
  const [selectedColor, setSelectedColor] = useState(palette[1]);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [diceFormula, setDiceFormula] = useState('1d20+5');
  const [lootResult, setLootResult] = useState('Potion of Healing');
  const [eventResult, setEventResult] = useState('Лесной дозор замечает костёр и выходит на переговоры.');
  const [journal, setJournal] = useState<JournalEntry[]>([
    { id: 'j1', type: 'system', text: 'Комната инициализирована. Можно рисовать карту и двигать токены.', time: nowTime() },
  ]);

  const selectedToken = useMemo(
    () => tokens.find((token) => token.id === selectedTokenId) ?? tokens[0],
    [selectedTokenId, tokens],
  );
  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.tokenId === selectedToken?.id),
    [selectedToken?.id, sheets],
  );

  const addJournalEntry = (type: JournalEntry['type'], text: string) => {
    setJournal((current) => [{ id: `${Date.now()}-${Math.random()}`, type, text, time: nowTime() }, ...current].slice(0, 12));
  };

  const paintCell = (x: number, y: number) => {
    const index = getCellIndex(x, y);

    if (tool === 'paint') {
      setMapTiles((current) => current.map((tile, tileIndex) => (tileIndex === index ? selectedColor : tile)));
      return;
    }

    if (tool === 'erase') {
      setMapTiles((current) => current.map((tile, tileIndex) => (tileIndex === index ? DEFAULT_TILE : tile)));
      setFogCells((current) => current.map((cell, cellIndex) => (cellIndex === index ? false : cell)));
      return;
    }

    if (tool === 'fog') {
      setFogCells((current) => current.map((cell, cellIndex) => (cellIndex === index ? !cell : cell)));
    }
  };

  const applyPointerToBoard = (clientX: number, clientY: number) => {
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = clamp(Math.floor(((clientX - rect.left) / rect.width) * GRID_COLS), 0, GRID_COLS - 1);
    const y = clamp(Math.floor(((clientY - rect.top) / rect.height) * GRID_ROWS), 0, GRID_ROWS - 1);

    if (draggingTokenId) {
      setTokens((current) =>
        current.map((token) => (token.id === draggingTokenId ? { ...token, x, y } : token)),
      );
      return;
    }

    if (tool !== 'move') {
      paintCell(x, y);
      return;
    }

    if (selectedTokenId) {
      setTokens((current) =>
        current.map((token) => (token.id === selectedTokenId ? { ...token, x, y } : token)),
      );
    }
  };

  useEffect(() => {
    if (!isPointerDown) return undefined;

    const handleMove = (event: PointerEvent) => {
      applyPointerToBoard(event.clientX, event.clientY);
    };

    const handleUp = () => {
      if (draggingTokenId) {
        const moved = tokens.find((token) => token.id === draggingTokenId);
        if (moved) {
          addJournalEntry('move', `${moved.name} перемещён на ${String.fromCharCode(65 + moved.x)}${moved.y + 1}.`);
        }
      }

      setIsPointerDown(false);
      setDraggingTokenId(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggingTokenId, isPointerDown, tokens]);

  const handleBoardPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setIsPointerDown(true);
    applyPointerToBoard(event.clientX, event.clientY);
  };

  const handleTokenPointerDown = (tokenId: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setSelectedTokenId(tokenId);
    setTool('move');
    setDraggingTokenId(tokenId);
    setIsPointerDown(true);
  };

  const handleUploadMap = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMapName(file.name.replace(/\.[^.]+$/, ''));
    addJournalEntry('map', `Загружена карта «${file.name}». Для MVP используется локальное имя файла как сцена.`);
  };

  const handleSendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    addJournalEntry('system', `Чат: ${trimmed}`);
    setChatInput('');
  };

  const handleRoll = () => {
    const result = rollFormula(diceFormula);
    if (!result) {
      addJournalEntry('system', `Не удалось распознать формулу ${diceFormula}. Пример: 1d20+5.`);
      return;
    }

    addJournalEntry(
      'dice',
      `${diceFormula} → ${result.total} (${result.rolls.join(', ')}${result.modifier ? ` ${result.modifier > 0 ? '+' : '-'} ${Math.abs(result.modifier)}` : ''})`,
    );
  };

  const handleRandomLoot = () => {
    const nextLoot = lootPool[Math.floor(Math.random() * lootPool.length)];
    setLootResult(nextLoot);
    addJournalEntry('loot', `Сгенерирован лут: ${nextLoot}.`);
  };

  const handleRandomEvent = () => {
    const nextEvent = randomEventPool[Math.floor(Math.random() * randomEventPool.length)];
    setEventResult(nextEvent);
    addJournalEntry('event', `Событие: ${nextEvent}`);
  };

  const handleSheetChange = <K extends keyof CharacterSheet>(key: K, value: CharacterSheet[K]) => {
    if (!selectedSheet) return;

    setSheets((current) =>
      current.map((sheet) => (sheet.id === selectedSheet.id ? { ...sheet, [key]: value } : sheet)),
    );

    if (key === 'hp' || key === 'maxHp' || key === 'ac' || key === 'speed') {
      setTokens((current) =>
        current.map((token) => {
          if (token.sheetId !== selectedSheet.id) return token;

          return {
            ...token,
            hp: key === 'hp' ? Number(value) : token.hp,
            maxHp: key === 'maxHp' ? Number(value) : token.maxHp,
            ac: key === 'ac' ? Number(value) : token.ac,
            speed: key === 'speed' ? Number(value) : token.speed,
          };
        }),
      );
    }
  };

  const paintedCells = mapTiles.filter((tile) => tile !== DEFAULT_TILE).length;
  const foggedCells = fogCells.filter(Boolean).length;

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="card flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm text-slate-400">Комната / {roomId}</div>
            <h1 className="text-2xl font-semibold text-white">Интерактивная демо-комната</h1>
            <p className="mt-1 text-sm text-slate-400">
              Здесь уже можно рисовать карту, двигать токены мышкой и редактировать лист персонажа локально.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
              На главную
            </Link>
            <label className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 cursor-pointer">
              Загрузить карту
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadMap} />
            </label>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-4">
            <div className="text-sm text-slate-400">Карта</div>
            <div className="mt-2 text-xl font-semibold text-white">{mapName}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Закрашено клеток</div>
            <div className="mt-2 text-xl font-semibold text-white">{paintedCells}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Fog cells</div>
            <div className="mt-2 text-xl font-semibold text-white">{foggedCells}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Активный токен</div>
            <div className="mt-2 text-xl font-semibold text-white">{selectedToken?.name ?? '—'}</div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
          <aside className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Инструменты карты</h2>
                <span className="badge">working demo</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {[
                  ['move', 'Двигать'],
                  ['paint', 'Рисовать'],
                  ['fog', 'Fog'],
                  ['erase', 'Стереть'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setTool(value as 'move' | 'paint' | 'fog' | 'erase')}
                    className={`rounded-2xl border px-3 py-2 ${tool === value ? 'border-fuchsia-400 bg-fuchsia-500/15 text-white' : 'border-white/10 text-slate-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Палитра</div>
                <div className="flex flex-wrap gap-2">
                  {palette.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`h-9 w-9 rounded-full border ${selectedColor === color ? 'border-white' : 'border-white/20'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Выбрать цвет ${color}`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  setMapTiles(createEmptyMap());
                  setFogCells(Array.from({ length: GRID_COLS * GRID_ROWS }, () => false));
                  addJournalEntry('map', 'Карта очищена до базовой сетки.');
                }}
                className="mt-4 w-full rounded-full border border-white/10 px-4 py-3 text-sm text-slate-200"
              >
                Очистить карту
              </button>
            </div>

            <div className="card p-4">
              <h2 className="text-lg font-semibold text-white">Токены</h2>
              <div className="mt-4 space-y-3 text-sm">
                {tokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => setSelectedTokenId(token.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left ${selectedTokenId === token.id ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/8'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-white">{token.name}</div>
                        <div className="text-slate-400">{token.kind} • {String.fromCharCode(65 + token.x)}{token.y + 1}</div>
                      </div>
                      <span className="text-xs text-slate-300">HP {token.hp}/{token.maxHp}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-4">
            <div className="card flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-slate-200">
              <span className="badge">Текущий инструмент: {tool}</span>
              <span className="badge">Drag token: зажми токен и перетащи</span>
              <span className="badge">Paint/Fog: зажми и веди по клеткам</span>
            </div>

            <div className="card p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Игровое поле</h2>
                  <p className="text-sm text-slate-400">ЛКМ по сетке рисует карту или двигает выбранный токен в зависимости от инструмента.</p>
                </div>
                <span className="badge">{GRID_COLS}×{GRID_ROWS}</span>
              </div>

              <div
                ref={boardRef}
                onPointerDown={handleBoardPointerDown}
                className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 touch-none select-none"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: GRID_COLS * GRID_ROWS }, (_, index) => {
                  const x = index % GRID_COLS;
                  const y = Math.floor(index / GRID_COLS);
                  return (
                    <div
                      key={`${x}-${y}`}
                      className="relative border border-white/10"
                      style={{ backgroundColor: mapTiles[index] }}
                    >
                      {fogCells[index] ? <div className="absolute inset-0 bg-slate-950/70" /> : null}
                    </div>
                  );
                })}

                {tokens.map((token) => {
                  const left = `calc(${((token.x + 0.5) / GRID_COLS) * 100}% - 1.5rem)`;
                  const top = `calc(${((token.y + 0.5) / GRID_ROWS) * 100}% - 1.5rem)`;
                  return (
                    <button
                      key={token.id}
                      onPointerDown={handleTokenPointerDown(token.id)}
                      className="absolute flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-semibold text-white shadow-lg"
                      style={{
                        left,
                        top,
                        borderColor: token.color,
                        backgroundColor: `${token.color}33`,
                        boxShadow: `0 0 24px ${token.color}55`,
                      }}
                    >
                      {token.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Чат / заметка</h2>
                  <span className="text-sm text-slate-400">локально в журнал</span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Например: Борин идёт к двери"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <button onClick={handleSendChat} className="rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white">
                    Отправить
                  </button>
                </div>
              </div>

              <div className="card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Кубы</h2>
                  <span className="text-sm text-slate-400">NdM±K</span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={diceFormula}
                    onChange={(event) => setDiceFormula(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
                  />
                  <button onClick={handleRoll} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-slate-950">
                    Roll
                  </button>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Журнал действий</h2>
                <span className="badge">последние 12 событий</span>
              </div>
              <div className="space-y-3 text-sm">
                {journal.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/8 px-4 py-3">
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Лист персонажа</h2>
                <span className="badge">editable</span>
              </div>

              {selectedSheet ? (
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <input value={selectedSheet.name} onChange={(event) => handleSheetChange('name', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={selectedSheet.race} onChange={(event) => handleSheetChange('race', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3" />
                    <input value={selectedSheet.heroClass} onChange={(event) => handleSheetChange('heroClass', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input type="number" value={selectedSheet.level} onChange={(event) => handleSheetChange('level', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3" />
                    <input type="number" value={selectedSheet.hp} onChange={(event) => handleSheetChange('hp', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3" />
                    <input type="number" value={selectedSheet.maxHp} onChange={(event) => handleSheetChange('maxHp', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3" />
                    <input type="number" value={selectedSheet.ac} onChange={(event) => handleSheetChange('ac', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3" />
                  </div>
                  <input type="number" value={selectedSheet.speed} onChange={(event) => handleSheetChange('speed', Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3" />
                  <textarea value={selectedSheet.spells} onChange={(event) => handleSheetChange('spells', event.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3" placeholder="Заклинания" />
                  <textarea value={selectedSheet.inventory} onChange={(event) => handleSheetChange('inventory', event.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3" placeholder="Инвентарь" />
                  <textarea value={selectedSheet.notes} onChange={(event) => handleSheetChange('notes', event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3" placeholder="Заметки персонажа" />
                  <button onClick={() => addJournalEntry('sheet', `Лист ${selectedSheet.name} обновлён.`)} className="w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-medium text-slate-950">
                    Зафиксировать изменение листа
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/8 px-4 py-3 text-sm text-slate-300">
                  У выбранного токена нет листа персонажа.
                </div>
              )}
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Инструменты мастера</h2>
                <span className="badge">GM toolkit</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/8 px-4 py-3">
                  <div className="font-medium text-white">Последний лут</div>
                  <div className="mt-1">{lootResult}</div>
                </div>
                <button onClick={handleRandomLoot} className="w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950">
                  Сгенерировать лут
                </button>
                <div className="rounded-2xl border border-white/8 px-4 py-3">
                  <div className="font-medium text-white">Последнее событие</div>
                  <div className="mt-1">{eventResult}</div>
                </div>
                <button onClick={handleRandomEvent} className="w-full rounded-full bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white">
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
