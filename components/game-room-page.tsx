'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

type RoomRole = 'gm' | 'player';
type JoinStep = 'auth' | 'player-sheet' | 'ready';
type DrawingTool = 'move' | 'terrain' | 'obstacle' | 'texture' | 'furniture' | 'fog' | 'erase';
type LayerKind = 'terrain' | 'obstacle' | 'texture' | 'furniture';
type TokenKind = 'player' | 'npc' | 'monster' | 'object';

type RoomToken = {
  id: string;
  name: string;
  short: string;
  kind: TokenKind;
  color: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  owner: string;
  roleOwner?: RoomRole;
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
  type: 'system' | 'move' | 'dice' | 'loot' | 'event' | 'sheet' | 'map' | 'room';
  text: string;
  time: string;
};

type CellData = {
  terrain: string;
  obstacle: string | null;
  texture: string | null;
  furniture: string | null;
  fog: boolean;
};

type RoomAccessState = {
  password: string;
  gmExists: boolean;
};

const GRID_COLS = 16;
const GRID_ROWS = 10;
const DEFAULT_TERRAIN = '#0f172a';
const roomAccessRegistry = new Map<string, RoomAccessState>();

const layerPalette: Record<LayerKind, string[]> = {
  terrain: ['#0f172a', '#334155', '#14532d', '#1d4ed8', '#92400e', '#4c1d95'],
  obstacle: ['#ef4444', '#f97316', '#eab308', '#84cc16'],
  texture: ['#22c55e', '#06b6d4', '#a855f7', '#f43f5e'],
  furniture: ['#f8fafc', '#cbd5e1', '#94a3b8', '#fde68a'],
};

const toolMeta: Array<{ value: DrawingTool; label: string; layer?: LayerKind }> = [
  { value: 'move', label: 'Токены' },
  { value: 'terrain', label: 'Покрытие', layer: 'terrain' },
  { value: 'obstacle', label: 'Препятствия', layer: 'obstacle' },
  { value: 'texture', label: 'Текстуры', layer: 'texture' },
  { value: 'furniture', label: 'Столы/объекты', layer: 'furniture' },
  { value: 'fog', label: 'Fog' },
  { value: 'erase', label: 'Стереть' },
];

const randomEventPool = [
  {
    title: 'Лесной феномен',
    description: 'Источник: dnd.su — лесные столкновения и путевые осложнения.',
    link: 'https://dnd.su',
  },
  {
    title: 'Подземельный триггер',
    description: 'Источник: dnd.su — случайные события для данжей и руин.',
    link: 'https://dnd.su',
  },
  {
    title: 'Городской поворот',
    description: 'Источник: dnd.su — городские встречи и побочные сцены.',
    link: 'https://dnd.su',
  },
];

const lootPool = [
  {
    name: 'Сумка с припасами и 35 зм',
    details: 'Источник: dnd.su — генерация лута для low-level encounters.',
    link: 'https://dnd.su',
  },
  {
    name: 'Зелье лечения + серебряный ключ',
    details: 'Источник: dnd.su — сокровища подземелий и тайников.',
    link: 'https://dnd.su',
  },
  {
    name: 'Свиток защиты + набор отмычек',
    details: 'Источник: dnd.su — таблицы магических и утилитарных находок.',
    link: 'https://dnd.su',
  },
];

const initialTokens: RoomToken[] = [
  {
    id: 'elira',
    name: 'Элира',
    short: 'Э',
    kind: 'player',
    color: 'rgb(34 211 238)',
    x: 2,
    y: 4,
    hp: 28,
    maxHp: 32,
    ac: 15,
    speed: 30,
    owner: 'Игрок',
    roleOwner: 'player',
    sheetId: 'sheet-elira',
  },
  {
    id: 'borin',
    name: 'Борин',
    short: 'Б',
    kind: 'player',
    color: 'rgb(251 191 36)',
    x: 4,
    y: 5,
    hp: 41,
    maxHp: 41,
    ac: 18,
    speed: 25,
    owner: 'Игрок',
    roleOwner: 'player',
    sheetId: 'sheet-borin',
  },
  {
    id: 'goblin',
    name: 'Гоблин-разведчик',
    short: 'G',
    kind: 'monster',
    color: 'rgb(244 63 94)',
    x: 11,
    y: 4,
    hp: 7,
    maxHp: 7,
    ac: 13,
    speed: 30,
    owner: 'GM',
    roleOwner: 'gm',
  },
  {
    id: 'table-1',
    name: 'Стол',
    short: '⌂',
    kind: 'object',
    color: 'rgb(168 85 247)',
    x: 8,
    y: 6,
    hp: 0,
    maxHp: 0,
    ac: 12,
    speed: 0,
    owner: 'GM',
    roleOwner: 'gm',
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

function createCell(): CellData {
  return {
    terrain: DEFAULT_TERRAIN,
    obstacle: null,
    texture: null,
    furniture: null,
    fog: false,
  };
}

function createEmptyMap() {
  return Array.from({ length: GRID_COLS * GRID_ROWS }, createCell);
}

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

function cellCoordinate(x: number, y: number) {
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

function getTokenInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'P';
}

function readNestedString(source: unknown, paths: string[][], fallback = '') {
  if (!source || typeof source !== 'object') return fallback;

  for (const path of paths) {
    let current: unknown = source;
    let found = true;

    for (const key of path) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        found = false;
        break;
      }
      current = (current as Record<string, unknown>)[key];
    }

    if (typeof current === 'string' && current.trim()) return current;
    if (typeof current === 'number') return String(current);
  }

  return fallback;
}

function readNestedNumber(source: unknown, paths: string[][], fallback = 10) {
  const value = readNestedString(source, paths, String(fallback));
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseLongStoryShortCharacter(raw: unknown): Partial<CharacterSheet> | null {
  if (!raw || typeof raw !== 'object') return null;

  return {
    name: readNestedString(raw, [['name'], ['characterName'], ['character', 'name']], 'Новый персонаж'),
    race: readNestedString(raw, [['race'], ['ancestry'], ['species']], 'Не указано'),
    heroClass: readNestedString(raw, [['class'], ['heroClass'], ['characterClass']], 'Adventurer'),
    level: readNestedNumber(raw, [['level'], ['character', 'level']], 1),
    hp: readNestedNumber(raw, [['hp'], ['hitPoints', 'current'], ['health', 'current']], 10),
    maxHp: readNestedNumber(raw, [['maxHp'], ['hitPoints', 'max'], ['health', 'max']], 10),
    ac: readNestedNumber(raw, [['ac'], ['armorClass']], 10),
    speed: readNestedNumber(raw, [['speed'], ['movement', 'walk']], 30),
    spells: readNestedString(raw, [['spellsText'], ['spells']], ''),
    inventory: readNestedString(raw, [['inventoryText'], ['inventory'], ['equipment']], ''),
    notes: readNestedString(raw, [['notes'], ['backstory'], ['description']], 'Импортировано из Long Story Short.'),
  };
}

function getPlayerTokens(tokens: RoomToken[]) {
  return tokens.filter((token) => token.kind === 'player');
}

export function GameRoomPage({ roomId }: { roomId: string }) {
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [roomPassword, setRoomPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [displayName, setDisplayName] = useState('Мастер Аркейн');
  const [role, setRole] = useState<RoomRole | null>(null);
  const [joinStep, setJoinStep] = useState<JoinStep>('auth');
  const [authError, setAuthError] = useState('');
  const [mapName, setMapName] = useState('Руины старой башни');
  const [mapTiles, setMapTiles] = useState<CellData[]>(createEmptyMap);
  const [tokens, setTokens] = useState<RoomToken[]>(initialTokens);
  const [sheets, setSheets] = useState<CharacterSheet[]>(initialSheets);
  const [selectedTokenId, setSelectedTokenId] = useState('elira');
  const [tool, setTool] = useState<DrawingTool>('move');
  const [selectedColor, setSelectedColor] = useState(layerPalette.terrain[1]);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [diceFormula, setDiceFormula] = useState('1d20+5');
  const [lootResult, setLootResult] = useState(lootPool[0]);
  const [eventResult, setEventResult] = useState(randomEventPool[0]);
  const [zoom, setZoom] = useState(1);
  const [journal, setJournal] = useState<JournalEntry[]>([
    {
      id: 'j1',
      type: 'system',
      text: 'Комната работает как обычная комната с паролем: первый вход становится мастером, остальные — игроками.',
      time: nowTime(),
    },
  ]);

  const selectedToken = useMemo(
    () => tokens.find((token) => token.id === selectedTokenId) ?? tokens[0],
    [selectedTokenId, tokens],
  );
  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.tokenId === selectedToken?.id),
    [selectedToken?.id, sheets],
  );
  const playerTokens = useMemo(() => getPlayerTokens(tokens), [tokens]);
  const activePalette = useMemo(() => {
    const toolConfig = toolMeta.find((item) => item.value === tool);
    return toolConfig?.layer ? layerPalette[toolConfig.layer] : layerPalette.terrain;
  }, [tool]);

  const addJournalEntry = (type: JournalEntry['type'], text: string) => {
    setJournal((current) => [{ id: `${Date.now()}-${Math.random()}`, type, text, time: nowTime() }, ...current].slice(0, 16));
  };

  const applyCellChange = (index: number, updater: (cell: CellData) => CellData) => {
    setMapTiles((current) => current.map((cell, cellIndex) => (cellIndex === index ? updater(cell) : cell)));
  };

  const paintCell = (x: number, y: number) => {
    const index = getCellIndex(x, y);

    if (tool === 'terrain') {
      applyCellChange(index, (cell) => ({ ...cell, terrain: selectedColor }));
      return;
    }

    if (tool === 'obstacle') {
      applyCellChange(index, (cell) => ({ ...cell, obstacle: selectedColor }));
      return;
    }

    if (tool === 'texture') {
      applyCellChange(index, (cell) => ({ ...cell, texture: selectedColor }));
      return;
    }

    if (tool === 'furniture') {
      applyCellChange(index, (cell) => ({ ...cell, furniture: selectedColor }));
      return;
    }

    if (tool === 'fog') {
      applyCellChange(index, (cell) => ({ ...cell, fog: !cell.fog }));
      return;
    }

    if (tool === 'erase') {
      applyCellChange(index, () => createCell());
    }
  };

  const canMoveToken = (token: RoomToken) => {
    if (role === 'gm') return true;
    if (role !== 'player') return false;
    return token.roleOwner === 'player';
  };

  const applyPointerToBoard = (clientX: number, clientY: number) => {
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = clamp(Math.floor(((clientX - rect.left) / rect.width) * GRID_COLS), 0, GRID_COLS - 1);
    const y = clamp(Math.floor(((clientY - rect.top) / rect.height) * GRID_ROWS), 0, GRID_ROWS - 1);

    if (draggingTokenId) {
      setTokens((current) => current.map((token) => (token.id === draggingTokenId ? { ...token, x, y } : token)));
      return;
    }

    if (tool !== 'move') {
      paintCell(x, y);
      return;
    }

    if (selectedTokenId) {
      setTokens((current) =>
        current.map((token) => {
          if (token.id !== selectedTokenId || !canMoveToken(token)) return token;
          return { ...token, x, y };
        }),
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
          addJournalEntry('move', `${moved.name} перемещён на ${cellCoordinate(moved.x, moved.y)}.`);
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
    if (joinStep !== 'ready') return;
    setIsPointerDown(true);
    applyPointerToBoard(event.clientX, event.clientY);
  };

  const handleTokenPointerDown = (tokenId: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const token = tokens.find((item) => item.id === tokenId);
    if (!token) return;

    setSelectedTokenId(tokenId);

    if (!canMoveToken(token)) return;

    setTool('move');
    setDraggingTokenId(tokenId);
    setIsPointerDown(true);
  };

  const handleUploadMap = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMapName(file.name.replace(/\.[^.]+$/, ''));
    addJournalEntry('map', `Загружена карта «${file.name}».`);
  };

  const handleSendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    addJournalEntry('system', `${displayName}: ${trimmed}`);
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
      `${displayName} бросает ${diceFormula} → ${result.total} (${result.rolls.join(', ')}${result.modifier ? ` ${result.modifier > 0 ? '+' : '-'} ${Math.abs(result.modifier)}` : ''})`,
    );
  };

  const handleRandomLoot = () => {
    const nextLoot = lootPool[Math.floor(Math.random() * lootPool.length)];
    setLootResult(nextLoot);
    addJournalEntry('loot', `Лут из dnd.su: ${nextLoot.name}. ${nextLoot.details}`);
  };

  const handleRandomEvent = () => {
    const nextEvent = randomEventPool[Math.floor(Math.random() * randomEventPool.length)];
    setEventResult(nextEvent);
    addJournalEntry('event', `Событие из dnd.su: ${nextEvent.title}. ${nextEvent.description}`);
  };

  const handleSheetChange = <K extends keyof CharacterSheet>(key: K, value: CharacterSheet[K]) => {
    if (!selectedSheet || role !== 'player') return;

    setSheets((current) => current.map((sheet) => (sheet.id === selectedSheet.id ? { ...sheet, [key]: value } : sheet)));

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

  const handleRoomAuth = () => {
    const name = displayName.trim() || 'Без имени';
    const pass = passwordInput.trim();

    if (!pass) {
      setAuthError('Нужен пароль комнаты.');
      return;
    }

    const currentState = roomAccessRegistry.get(roomId);

    if (!currentState) {
      roomAccessRegistry.set(roomId, { password: pass, gmExists: true });
      setRoomPassword(pass);
      setRole('gm');
      setJoinStep('ready');
      setAuthError('');
      setDisplayName(name);
      addJournalEntry('room', `${name} создал комнату как мастер и задал пароль.`);
      return;
    }

    if (currentState.password !== pass) {
      setAuthError('Неверный пароль комнаты.');
      return;
    }

    setRoomPassword(pass);
    setRole('player');
    setJoinStep('player-sheet');
    setAuthError('');
    setDisplayName(name);
    addJournalEntry('room', `${name} присоединился к комнате как игрок.`);
  };

  const createPlayerCharacter = () => {
    const nextIndex = playerTokens.length + 1;
    const tokenId = `player-${nextIndex}`;
    const sheetId = `sheet-${tokenId}`;
    const name = `Игрок ${nextIndex}`;

    const nextToken: RoomToken = {
      id: tokenId,
      name,
      short: getTokenInitial(name),
      kind: 'player',
      color: 'rgb(96 165 250)',
      x: 1 + (nextIndex % 4),
      y: 1 + (nextIndex % 5),
      hp: 12,
      maxHp: 12,
      ac: 12,
      speed: 30,
      owner: displayName,
      roleOwner: 'player',
      sheetId,
    };

    const nextSheet: CharacterSheet = {
      id: sheetId,
      tokenId,
      name,
      race: 'Human',
      heroClass: 'Adventurer',
      level: 1,
      hp: 12,
      maxHp: 12,
      ac: 12,
      speed: 30,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      notes: 'Создано игроком в комнате.',
      inventory: '',
      spells: '',
    };

    setTokens((current) => [...current, nextToken]);
    setSheets((current) => [...current, nextSheet]);
    setSelectedTokenId(tokenId);
    setJoinStep('ready');
    addJournalEntry('sheet', `${displayName} создал новый лист персонажа.`);
  };

  const handleImportCharacterJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const imported = parseLongStoryShortCharacter(parsed);
      if (!imported) {
        addJournalEntry('system', 'Не удалось прочитать JSON персонажа.');
        return;
      }

      const nextIndex = playerTokens.length + 1;
      const tokenId = `player-${nextIndex}`;
      const sheetId = `sheet-${tokenId}`;
      const characterName = imported.name || `Игрок ${nextIndex}`;
      const hp = imported.hp ?? 10;
      const maxHp = imported.maxHp ?? hp;
      const ac = imported.ac ?? 10;
      const speed = imported.speed ?? 30;

      const nextToken: RoomToken = {
        id: tokenId,
        name: characterName,
        short: getTokenInitial(characterName),
        kind: 'player',
        color: 'rgb(34 197 94)',
        x: 1 + (nextIndex % 4),
        y: 1 + (nextIndex % 5),
        hp,
        maxHp,
        ac,
        speed,
        owner: displayName,
        roleOwner: 'player',
        sheetId,
      };

      const nextSheet: CharacterSheet = {
        id: sheetId,
        tokenId,
        name: characterName,
        race: imported.race || 'Не указано',
        heroClass: imported.heroClass || 'Adventurer',
        level: imported.level ?? 1,
        hp,
        maxHp,
        ac,
        speed,
        stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        notes: imported.notes || 'Импортировано из Long Story Short.',
        inventory: imported.inventory || '',
        spells: imported.spells || '',
      };

      setTokens((current) => [...current, nextToken]);
      setSheets((current) => [...current, nextSheet]);
      setSelectedTokenId(tokenId);
      setJoinStep('ready');
      addJournalEntry('sheet', `${displayName} импортировал персонажа из JSON Long Story Short (${file.name}).`);
    } catch {
      addJournalEntry('system', `Файл ${file.name} не является валидным JSON.`);
    }
  };

  const paintedCells = mapTiles.filter((tile) => tile.terrain !== DEFAULT_TERRAIN).length;
  const foggedCells = mapTiles.filter((tile) => tile.fog).length;
  const obstacleCells = mapTiles.filter((tile) => tile.obstacle).length;
  const textureCells = mapTiles.filter((tile) => tile.texture).length;
  const furnitureCells = mapTiles.filter((tile) => tile.furniture).length;

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-4">
        <header className="card flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm text-slate-400">Комната / {roomId}</div>
            <h1 className="text-2xl font-semibold text-white">Комната с паролем вместо отдельной демо-комнаты</h1>
            <p className="mt-1 text-sm text-slate-400">
              Первый вход по паролю становится мастером, следующие участники с тем же паролем заходят как игроки и создают лист вручную или через JSON с Long Story Short.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
              На главную
            </Link>
            <label className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
              Загрузить карту
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadMap} />
            </label>
          </div>
        </header>

        {joinStep !== 'ready' ? (
          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="card p-6">
              <span className="badge">Вход в комнату</span>
              <h2 className="mt-4 text-2xl font-semibold text-white">Одна комната, пароль и автоматическая роль</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                Если комната ещё не создана, введённый пароль будет сохранён и этот вход станет мастером. Если комната уже существует, тот же пароль пустит внутрь как игрока.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Ваше имя"
                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                />
                <input
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  type="password"
                  placeholder="Пароль комнаты"
                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                />
              </div>
              {authError ? <div className="mt-3 text-sm text-rose-300">{authError}</div> : null}
              <button onClick={handleRoomAuth} className="mt-5 rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-medium text-white">
                Войти в комнату
              </button>
            </div>

            <div className="card p-6">
              {role === 'player' && joinStep === 'player-sheet' ? (
                <>
                  <span className="badge">Лист игрока</span>
                  <h2 className="mt-4 text-2xl font-semibold text-white">Выберите, как добавить персонажа</h2>
                  <div className="mt-5 space-y-4 text-sm text-slate-300">
                    <button onClick={createPlayerCharacter} className="w-full rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-left">
                      <div className="font-medium text-white">Заполнить лист в комнате</div>
                      <div className="mt-1 text-slate-300">Создаётся пустой шаблон персонажа, который игрок редактирует вручную.</div>
                    </button>
                    <label className="block cursor-pointer rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-4 text-left">
                      <div className="font-medium text-white">Залить JSON с longstoryshort.app</div>
                      <div className="mt-1 text-slate-300">Загружается JSON-экспорт цифрового листа, затем он превращается в токен и лист персонажа.</div>
                      <input type="file" accept="application/json" className="hidden" onChange={handleImportCharacterJson} />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <span className="badge">Роли</span>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl border border-white/10 px-4 py-3">
                      <div className="font-medium text-white">Мастер</div>
                      <div className="mt-1">Задаёт пароль, загружает карту, рисует препятствия, текстуры, мебель и запускает dnd.su-инструменты.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 px-4 py-3">
                      <div className="font-medium text-white">Игрок</div>
                      <div className="mt-1">Заходит по тому же паролю, импортирует лист или заполняет его вручную, затем управляет своим токеном.</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="card p-4">
            <div className="text-sm text-slate-400">Карта</div>
            <div className="mt-2 text-xl font-semibold text-white">{mapName}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Роль</div>
            <div className="mt-2 text-xl font-semibold text-white">{role === 'gm' ? 'Мастер' : role === 'player' ? 'Игрок' : 'Не выбрана'}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Пароль комнаты</div>
            <div className="mt-2 text-xl font-semibold text-white">{roomPassword ? '••••••••' : 'Не задан'}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Активный токен</div>
            <div className="mt-2 text-xl font-semibold text-white">{selectedToken?.name ?? '—'}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Масштаб карты</div>
            <div className="mt-2 text-xl font-semibold text-white">{Math.round(zoom * 100)}%</div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_420px]">
          <aside className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Инструменты карты</h2>
                <span className="badge">master map kit</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {toolMeta.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setTool(item.value);
                      if (item.layer) {
                        setSelectedColor(layerPalette[item.layer][0]);
                      }
                    }}
                    className={`rounded-2xl border px-3 py-2 ${tool === item.value ? 'border-fuchsia-400 bg-fuchsia-500/15 text-white' : 'border-white/10 text-slate-300'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Палитра активного слоя</div>
                <div className="flex flex-wrap gap-2">
                  {activePalette.map((color) => (
                    <button
                      key={`${tool}-${color}`}
                      onClick={() => setSelectedColor(color)}
                      className={`h-9 w-9 rounded-full border ${selectedColor === color ? 'border-white' : 'border-white/20'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Выбрать цвет ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <label className="block">
                  <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Zoom</div>
                  <input type="range" min="60" max="180" value={Math.round(zoom * 100)} onChange={(event) => setZoom(Number(event.target.value) / 100)} className="w-full" />
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>Покрытие: {paintedCells}</div>
                  <div>Fog: {foggedCells}</div>
                  <div>Препятствия: {obstacleCells}</div>
                  <div>Текстуры: {textureCells}</div>
                  <div>Мебель: {furnitureCells}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setMapTiles(createEmptyMap());
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
                        <div className="text-slate-400">{token.kind} • {cellCoordinate(token.x, token.y)}</div>
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
              <span className="badge">Инструмент: {tool}</span>
              <span className="badge">Zoom: {Math.round(zoom * 100)}%</span>
              <span className="badge">Роль: {role === 'gm' ? 'Мастер' : 'Игрок'}</span>
              <span className="badge">Игрок редактирует только свой лист и свой токен</span>
            </div>

            <div className="card p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Игровое поле</h2>
                  <p className="text-sm text-slate-400">Карта масштабируется и поддерживает отдельные слои: покрытие, препятствия, текстуры, мебель и fog of war.</p>
                </div>
                <span className="badge">{GRID_COLS}×{GRID_ROWS}</span>
              </div>

              <div ref={boardViewportRef} className="overflow-auto rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <div
                  ref={boardRef}
                  onPointerDown={handleBoardPointerDown}
                  className="relative aspect-[16/10] min-w-[760px] touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {Array.from({ length: GRID_COLS * GRID_ROWS }, (_, index) => {
                    const x = index % GRID_COLS;
                    const y = Math.floor(index / GRID_COLS);
                    const cell = mapTiles[index];
                    return (
                      <div key={`${x}-${y}`} className="relative border border-white/10" style={{ backgroundColor: cell.terrain }}>
                        {cell.texture ? <div className="absolute inset-[18%] rounded-md opacity-40" style={{ backgroundColor: cell.texture }} /> : null}
                        {cell.obstacle ? <div className="absolute inset-x-[15%] bottom-[15%] top-[15%] rounded-md border-2 opacity-90" style={{ borderColor: cell.obstacle, backgroundColor: `${cell.obstacle}33` }} /> : null}
                        {cell.furniture ? <div className="absolute inset-x-[20%] inset-y-[32%] rounded-sm" style={{ backgroundColor: cell.furniture }} /> : null}
                        {cell.fog ? <div className="absolute inset-0 bg-slate-950/70" /> : null}
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
                <span className="badge">последние 16 событий</span>
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
                <span className="badge">player editable</span>
              </div>

              {selectedSheet ? (
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  <input value={selectedSheet.name} disabled={role !== 'player'} onChange={(event) => handleSheetChange('name', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={selectedSheet.race} disabled={role !== 'player'} onChange={(event) => handleSheetChange('race', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" />
                    <input value={selectedSheet.heroClass} disabled={role !== 'player'} onChange={(event) => handleSheetChange('heroClass', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input type="number" disabled={role !== 'player'} value={selectedSheet.level} onChange={(event) => handleSheetChange('level', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" />
                    <input type="number" disabled={role !== 'player'} value={selectedSheet.hp} onChange={(event) => handleSheetChange('hp', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" />
                    <input type="number" disabled={role !== 'player'} value={selectedSheet.maxHp} onChange={(event) => handleSheetChange('maxHp', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" />
                    <input type="number" disabled={role !== 'player'} value={selectedSheet.ac} onChange={(event) => handleSheetChange('ac', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" />
                  </div>
                  <input type="number" disabled={role !== 'player'} value={selectedSheet.speed} onChange={(event) => handleSheetChange('speed', Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" />
                  <textarea value={selectedSheet.spells} disabled={role !== 'player'} onChange={(event) => handleSheetChange('spells', event.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Заклинания" />
                  <textarea value={selectedSheet.inventory} disabled={role !== 'player'} onChange={(event) => handleSheetChange('inventory', event.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Инвентарь" />
                  <textarea value={selectedSheet.notes} disabled={role !== 'player'} onChange={(event) => handleSheetChange('notes', event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Заметки персонажа" />
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
                <span className="badge">dnd.su only</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/8 px-4 py-3">
                  <div className="font-medium text-white">Последний лут</div>
                  <div className="mt-1">{lootResult.name}</div>
                  <a className="mt-2 inline-flex text-cyan-300 underline" href={lootResult.link} target="_blank" rel="noreferrer">Источник: dnd.su</a>
                </div>
                <button onClick={handleRandomLoot} className="w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950">
                  Сгенерировать лут
                </button>
                <div className="rounded-2xl border border-white/8 px-4 py-3">
                  <div className="font-medium text-white">Последнее событие</div>
                  <div className="mt-1">{eventResult.title}</div>
                  <div className="mt-1 text-slate-400">{eventResult.description}</div>
                  <a className="mt-2 inline-flex text-cyan-300 underline" href={eventResult.link} target="_blank" rel="noreferrer">Источник: dnd.su</a>
                </div>
                <button onClick={handleRandomEvent} className="w-full rounded-full bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white">
                  Случайное событие
                </button>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Виджет местности</h2>
                <span className="badge">regional map</span>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                Отдельный виджет с картой реальной местности по аналогии с waterdeep viewer — можно держать региональный контекст рядом с тактической сценой.
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
                <iframe
                  title="Карта местности Waterdeep style"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=37.55%2C55.70%2C37.75%2C55.82&amp;layer=mapnik"
                  className="h-[320px] w-full"
                />
              </div>
              <div className="mt-3 text-xs text-slate-400">Встраивание сделано как внешний map widget, который можно заменить на любой конкретный регион кампании.</div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
