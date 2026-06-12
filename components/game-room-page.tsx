"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { CharacterXpCard } from "@/components/character-xp-card";
import { LevelUpBanner } from "@/components/level-up-banner";
import { LevelUpDrawer } from "@/components/level-up-drawer";
import { MasterLayoutEditor } from "@/components/master-layout-editor";
import { MasterWorkspaceHeader } from "@/components/master-workspace-header";
import { MasterSideDrawer } from "@/components/room/gm/master-side-drawer";
import { JoinGate } from "@/components/room/join/join-gate";
import { RoomHeader } from "@/components/room/shell/room-header";
import { RoomStatusGrid } from "@/components/room/shell/room-status-grid";
import {
  type LayoutConfig as MasterLayoutConfig,
  type MasterPanelSize as MasterLayoutSize,
  getMasterPanelDefinition,
  getMasterPanelSpanTokens,
  normalizeSavedLayoutConfig,
} from "@/lib/master-panel-layout";
import {
  buildSavedRoomState,
  getCharacterLibraryStorageKey,
  getRoomStorageKey,
} from "@/lib/room/storage";
import {
  applyXp,
  buildLevelUpPreview,
  classes as levelUpClasses,
  deriveCharacterProgression,
  getProgressionOptions,
  startLevelUp,
  confirmLevelUp,
  type CampaignConfig,
  type CharacterClassLevel,
  type LevelUpDraft,
} from "@/lib/level-up";

type RoomRole = "gm" | "player" | "spectator";
type JoinStep = "auth" | "player-sheet" | "ready";
type JoinIntent = "gm" | "player" | null;
type DrawingTool =
  | "move"
  | "terrain"
  | "obstacle"
  | "texture"
  | "furniture"
  | "fog"
  | "erase";
type LayerKind = "terrain" | "obstacle" | "texture" | "furniture";
type TokenKind = "player" | "npc" | "monster" | "object";
type BoardKind = "public" | "gm";
type LootCrBand = "0-4" | "5-10" | "11-16" | "17+";
type MasterViewPreset = "combat" | "explore" | "prep";
type TokenStatusKey =
  | "poisoned"
  | "stunned"
  | "prone"
  | "concentrating"
  | "restrained"
  | "blessed"
  | "invisible"
  | "exhausted";

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
  gmOnly?: boolean;
  hiddenFromPlayers?: boolean;
  linkedMapId?: string;
  mapId?: string;
  visionRadius?: number;
  statuses?: TokenStatusKey[];
};

type CharacterStats = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

type CharacterResourceTrack = {
  current: number;
  max: number;
};

type CharacterDeathSaves = {
  successes: number;
  failures: number;
};

type CharacterResources = {
  spellSlots?: CharacterResourceTrack[];
  hitDice?: CharacterResourceTrack;
  rage?: CharacterResourceTrack;
  ki?: CharacterResourceTrack;
  sorceryPoints?: CharacterResourceTrack;
  deathSaves?: CharacterDeathSaves;
  exhaustion?: number;
};

type CharacterSheet = {
  id: string;
  tokenId: string;
  name: string;
  race: string;
  heroClass: string;
  subclass?: string;
  background?: string;
  alignment?: string;
  playerName?: string;
  level: number;
  experience?: number;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  initiative?: number;
  proficiencyBonus?: number;
  stats: CharacterStats;
  age?: string;
  height?: string;
  weight?: string;
  eyes?: string;
  skin?: string;
  hair?: string;
  avatarUrl?: string;
  notes: string;
  inventory: string;
  spells: string;
  appearance?: string;
  personality?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  allies?: string;
  proficiencies?: string;
  traits?: string;
  equipmentDetails?: string;
  attacks?: string;
  feats?: string;
  features?: string;
  resources?: CharacterResources;
  classLevels?: CharacterClassLevel[];
  takenFeatIds?: string[];
  selectedSubclassId?: string;
  knownSpellIds?: string[];
};

type JournalEntry = {
  id: string;
  type:
    | "system"
    | "move"
    | "dice"
    | "loot"
    | "event"
    | "sheet"
    | "map"
    | "room"
    | "save"
    | "initiative";
  text: string;
  time: string;
};

type ToastMessage = {
  id: string;
  tone: "success" | "info" | "warning";
  text: string;
};

type InitiativeParticipant = {
  tokenId: string;
  name: string;
  kind: TokenKind;
  initiative: number;
  initiativeModifier: number;
  color: string;
  hiddenFromPlayers?: boolean;
};

type InitiativeState = {
  active: boolean;
  round: number;
  currentTurnIndex: number;
  participants: InitiativeParticipant[];
};

type CellData = {
  terrain: string;
  terrainPreset?: "stone" | "wood" | "water" | "earth" | "grass";
  obstacle: string | null;
  obstacleScale?: "full" | "half" | "quarter";
  obstacleAnchor?: "center" | "tl" | "tr" | "bl" | "br";
  obstaclePreset?: "stone-wall" | "wood-wall" | "door" | "column" | "light";
  texture: string | null;
  texturePreset?: "moss" | "rubble" | "sand" | "blood" | "tiles";
  furniture: string | null;
  furnitureScale?: "full" | "half" | "quarter";
  furnitureAnchor?: "center" | "tl" | "tr" | "bl" | "br";
  furniturePreset?: "table" | "chair" | "stage" | "crate" | "altar";
  furnitureVariant?: "wood" | "stone" | "velvet";
  fog: boolean;
};

type RoomAccessState = {
  password: string;
  gmExists: boolean;
};

type MapState = {
  cols: number;
  rows: number;
  publicTiles: CellData[];
  gmTiles: CellData[];
};

type LootResult = {
  name: string;
  details: string;
  link: string;
  rolledMagicItems?: Array<{
    table: string;
    roll: number;
    name: string;
    link: string;
  }>;
  rolledGems?: string[];
};

type SavedRoomState = {
  mapName: string;
  mapState: MapState;
  savedMaps?: SavedMapPreset[];
  activeSavedMapId?: string | null;
  widgetUrl?: string;
  useFogOfWar?: boolean;
  useSharedGmMapForPlayers?: boolean;
  mainMapSnapshot?: {
    mapName: string;
    mapState: MapState;
  };
  tokens: RoomToken[];
  sheets: CharacterSheet[];
  journal: JournalEntry[];
  initiative?: InitiativeState;
  gmLayout?:
    | Partial<MasterLayoutConfig>
    | {
        panelOrder?: MasterPanelId[];
        panelWidths?: Partial<Record<MasterPanelId, number>>;
      };
  creaturesDrawerWidth?: number;
};

type SavedMapPreset = {
  id: string;
  name: string;
  mapName: string;
  mapState: MapState;
};

type SavedCharacterPreset = {
  id: string;
  name: string;
  savedAt: string;
  sheet: CharacterSheet;
};

type SilkNpcTemplate = {
  name: string;
  short: string;
  kind: TokenKind;
  color: string;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  statuses?: TokenStatusKey[];
};

type SilkLocation = {
  id: string;
  name: string;
  atmosphere: string;
  usualGuests: string;
  sceneGoal: string;
  rewards: string;
  danger: string;
  terrainPreset: CellData["terrainPreset"];
  texturePreset?: CellData["texturePreset"];
  npcs: SilkNpcTemplate[];
};

const DEFAULT_COLS = 16;
const DEFAULT_ROWS = 10;
const MIN_GRID = 4;
const MAX_GRID = 99;
const DEFAULT_TERRAIN = "#0f172a";
const roomAccessRegistry = new Map<string, RoomAccessState>();

const DEFAULT_WIDGET_URL = "https://tychmaps.com/waterdeep/";

type MasterPanelId = "admin" | "tokens" | "party" | "initiative" | "tools";

const masterPanelShortLabels: Record<MasterPanelId, string> = {
  admin: "Админ",
  tokens: "Ток.",
  party: "Пати",
  initiative: "Иниц.",
  tools: "Утил.",
};
const masterPanelIcons: Record<MasterPanelId, string> = {
  admin: "🧭",
  tokens: "🧩",
  party: "👥",
  initiative: "⚔️",
  tools: "📜",
};

const masterPanelMeta: Record<
  MasterPanelId,
  { title: string; description: string }
> = {
  admin: {
    title: "Сцена: админ-панель",
    description: "Карта, кисти, слои и параметры сцены.",
  },
  tokens: {
    title: "Существа: токены",
    description: "Список существ, быстрые действия и управление токенами.",
  },
  party: {
    title: "Существа: персонажи группы",
    description: "Карточки персонажей, библиотека и управление составом.",
  },
  initiative: {
    title: "Бой: инициатива",
    description: "Боевой трекер, ход и порядок участников.",
  },
  tools: {
    title: "Нарратив: инструменты",
    description: "Журнал, лут, события и вспомогательные сервисы мастера.",
  },
};

const masterPanelGroups: Record<MasterPanelId, "scene" | "creatures" | "combat" | "narrative"> = {
  admin: "scene",
  tokens: "creatures",
  party: "creatures",
  initiative: "combat",
  tools: "narrative",
};

const masterGroupLabels: Record<"scene" | "creatures" | "combat" | "narrative", string> = {
  scene: "Сцена",
  creatures: "Существа",
  combat: "Бой",
  narrative: "Нарратив",
};

function getMasterPanelGridSpan(panelId: MasterPanelId, size: MasterLayoutSize) {
  return getMasterPanelSpanTokens(panelId, size).xl;
}

const layerPalette: Record<LayerKind, string[]> = {
  terrain: ["#0f172a", "#334155", "#14532d", "#1d4ed8", "#92400e", "#4c1d95"],
  obstacle: ["#ef4444", "#f97316", "#eab308", "#84cc16"],
  texture: ["#22c55e", "#06b6d4", "#a855f7", "#f43f5e"],
  furniture: ["#f8fafc", "#cbd5e1", "#94a3b8", "#fde68a"],
};

const terrainBrushes = [
  { id: "stone", label: "Камень", color: "#475569" },
  { id: "wood", label: "Дерево", color: "#92400e" },
  { id: "water", label: "Вода", color: "#1d4ed8" },
  { id: "earth", label: "Земля", color: "#7c2d12" },
  { id: "grass", label: "Трава", color: "#166534" },
] as const;

const textureBrushes = [
  { id: "moss", label: "Мох", color: "#22c55e" },
  { id: "rubble", label: "Щебень", color: "#a1a1aa" },
  { id: "sand", label: "Песок", color: "#facc15" },
  { id: "blood", label: "Кровь", color: "#dc2626" },
  { id: "tiles", label: "Плитка", color: "#94a3b8" },
] as const;

const obstacleBrushes = [
  { id: "stone-wall", label: "Стена (кам.)", color: "#64748b" },
  { id: "wood-wall", label: "Стена (дер.)", color: "#a16207" },
  { id: "door", label: "Дверь", color: "#f59e0b" },
  { id: "column", label: "Колонна", color: "#cbd5e1" },
  { id: "light", label: "Источник света", color: "#fde047" },
] as const;

const furnitureBrushes = [
  { id: "table", label: "Стол", color: "#d6d3d1" },
  { id: "chair", label: "Стул", color: "#e7e5e4" },
  { id: "stage", label: "Сцена/возвыш.", color: "#a78bfa" },
  { id: "crate", label: "Ящик", color: "#b45309" },
  { id: "altar", label: "Алтарь", color: "#e2e8f0" },
] as const;

const toolMeta: Array<{
  value: DrawingTool;
  label: string;
  layer?: LayerKind;
}> = [
  { value: "move", label: "Токены" },
  { value: "terrain", label: "Покрытие", layer: "terrain" },
  { value: "obstacle", label: "Препятствия", layer: "obstacle" },
  { value: "texture", label: "Текстуры", layer: "texture" },
  { value: "furniture", label: "Столы/объекты", layer: "furniture" },
  { value: "fog", label: "Туман" },
  { value: "erase", label: "Стереть" },
];

const tokenStatusCatalog: Array<{
  key: TokenStatusKey;
  label: string;
  short: string;
  colorClass: string;
  description: string;
}> = [
  {
    key: "poisoned",
    label: "Poisoned",
    short: "PSN",
    colorClass: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    description: "помеха на атаки и проверки",
  },
  {
    key: "stunned",
    label: "Stunned",
    short: "STN",
    colorClass: "bg-amber-500/20 text-amber-100 border-amber-400/30",
    description: "без действий и реакций",
  },
  {
    key: "prone",
    label: "Prone",
    short: "PRN",
    colorClass: "bg-slate-500/30 text-slate-100 border-slate-300/20",
    description: "лежит на земле",
  },
  {
    key: "concentrating",
    label: "Concentrating",
    short: "CON",
    colorClass: "bg-violet-500/20 text-violet-100 border-violet-400/30",
    description: "держит концентрацию",
  },
  {
    key: "restrained",
    label: "Restrained",
    short: "RST",
    colorClass: "bg-rose-500/20 text-rose-100 border-rose-400/30",
    description: "скорость 0, помеха на ЛОВ",
  },
  {
    key: "blessed",
    label: "Blessed",
    short: "BLS",
    colorClass: "bg-cyan-500/20 text-cyan-100 border-cyan-400/30",
    description: "бафф на атаки/спасброски",
  },
  {
    key: "invisible",
    label: "Invisible",
    short: "INV",
    colorClass: "bg-indigo-500/20 text-indigo-100 border-indigo-400/30",
    description: "сложнее заметить и атаковать",
  },
  {
    key: "exhausted",
    label: "Exhausted",
    short: "EXH",
    colorClass: "bg-orange-500/20 text-orange-100 border-orange-400/30",
    description: "накапливаемое истощение",
  },
];

const randomEventPool = [
  {
    title: "Смена давления в глубине руин",
    description:
      "Опирается на раздел игровых механик и сцен, чтобы мастер быстро добавил локальное осложнение, шум или внезапное давление среды.",
    link: "https://dnd.su/articles/mechanics/",
  },
  {
    title: "Неожиданная находка в пути",
    description:
      "Опирается на раздел инвентаря dnd.su, чтобы превращать исследование в маленькое событие: безделушку, припасы или зацепку.",
    link: "https://dnd.su/articles/inventory/",
  },
  {
    title: "Сцена для мастера из справочника",
    description:
      "Опирается на основной справочник dnd.su как на стартовую ссылку для выбора конкретного существа, ловушки или предмета прямо во время сессии.",
    link: "https://dnd.su/",
  },
];

const treasuryArticleLink =
  "https://www.dnd.su/articles/inventory/74-treasury/";

const treasureCoinTables: Record<
  LootCrBand,
  Array<{ range: [number, number]; coins: string[] }>
> = {
  "0-4": [
    { range: [1, 30], coins: ["5к6 мм"] },
    { range: [31, 60], coins: ["4к6 см"] },
    { range: [61, 70], coins: ["3к6 эм"] },
    { range: [71, 95], coins: ["3к6 зм"] },
    { range: [96, 100], coins: ["1к6 пм"] },
  ],
  "5-10": [
    { range: [1, 30], coins: ["4к6 × 100 мм", "1к6 × 10 эм"] },
    { range: [31, 60], coins: ["6к6 × 10 см", "2к6 × 10 зм"] },
    { range: [61, 70], coins: ["3к6 × 10 эм", "2к6 × 10 зм"] },
    { range: [71, 95], coins: ["4к6 × 10 зм"] },
    { range: [96, 100], coins: ["2к6 × 10 зм", "3к6 пм"] },
  ],
  "11-16": [
    { range: [1, 20], coins: ["4к6 × 100 см", "1к6 × 100 зм"] },
    { range: [21, 35], coins: ["1к6 × 100 эм", "1к6 × 100 зм"] },
    { range: [36, 75], coins: ["2к6 × 100 зм", "1к6 × 10 пм"] },
    { range: [76, 100], coins: ["2к6 × 100 зм", "2к6 × 10 пм"] },
  ],
  "17+": [
    { range: [1, 15], coins: ["2к6 × 1000 эм", "8к6 × 100 зм"] },
    { range: [16, 55], coins: ["1к6 × 1000 зм", "1к6 × 100 пм"] },
    { range: [56, 100], coins: ["1к6 × 1000 зм", "2к6 × 100 пм"] },
  ],
};

const hoardCoinTables: Record<LootCrBand, string[]> = {
  "0-4": ["6к6 × 100 мм", "3к6 × 100 см", "2к6 × 10 зм"],
  "5-10": ["2к6 × 100 мм", "2к6 × 1000 см", "6к6 × 100 зм", "3к6 × 10 пм"],
  "11-16": ["4к6 × 1000 зм", "5к6 × 100 пм"],
  "17+": ["12к6 × 1000 зм", "8к6 × 1000 пм"],
};

const hoardTables: Record<
  LootCrBand,
  Array<{ range: [number, number]; treasure: string; magic?: string }>
> = {
  "0-4": [
    {
      range: [1, 6],
      treasure: "Без дополнительных драгоценностей и произведений искусства.",
    },
    { range: [7, 16], treasure: "2к6 драгоценных камней стоимостью 10 зм." },
    { range: [17, 26], treasure: "2к4 предметов искусства стоимостью 25 зм." },
    { range: [27, 36], treasure: "2к6 драгоценных камней стоимостью 50 зм." },
    {
      range: [37, 44],
      treasure: "2к6 драгоценных камней стоимостью 10 зм.",
      magic: "1к6 предметов из таблицы А.",
    },
    {
      range: [45, 52],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1к6 предметов из таблицы А.",
    },
    {
      range: [53, 60],
      treasure: "2к6 драгоценных камней стоимостью 50 зм.",
      magic: "1к6 предметов из таблицы А.",
    },
    {
      range: [61, 65],
      treasure: "2к6 драгоценных камней стоимостью 10 зм.",
      magic: "1к4 предметов из таблицы Б.",
    },
    {
      range: [66, 70],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1к4 предметов из таблицы Б.",
    },
    {
      range: [71, 75],
      treasure: "2к6 драгоценных камней стоимостью 50 зм.",
      magic: "1к4 предметов из таблицы Б.",
    },
    {
      range: [76, 78],
      treasure: "2к6 драгоценных камней стоимостью 10 зм.",
      magic: "1к4 предметов из таблицы В.",
    },
    {
      range: [79, 80],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1к4 предметов из таблицы В.",
    },
    {
      range: [81, 85],
      treasure: "2к6 драгоценных камней стоимостью 50 зм.",
      magic: "1к4 предметов из таблицы В.",
    },
    {
      range: [86, 92],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1к4 предметов из таблицы Е.",
    },
    {
      range: [93, 97],
      treasure: "2к6 драгоценных камней стоимостью 50 зм.",
      magic: "1к4 предметов из таблицы Е.",
    },
    {
      range: [98, 99],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1 предмет из таблицы Ё.",
    },
    {
      range: [100, 100],
      treasure: "2к6 драгоценных камней стоимостью 50 зм.",
      magic: "1 предмет из таблицы Ё.",
    },
  ],
  "5-10": [
    {
      range: [1, 4],
      treasure: "Без дополнительных драгоценностей и произведений искусства.",
    },
    { range: [5, 10], treasure: "2к4 предметов искусства стоимостью 25 зм." },
    { range: [11, 16], treasure: "3к6 драгоценных камней стоимостью 50 зм." },
    { range: [17, 22], treasure: "3к6 драгоценных камней стоимостью 100 зм." },
    { range: [23, 28], treasure: "2к4 предметов искусства стоимостью 250 зм." },
    {
      range: [29, 32],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1к6 предметов из таблицы А.",
    },
    {
      range: [33, 36],
      treasure: "3к6 драгоценных камней стоимостью 50 зм.",
      magic: "1к6 предметов из таблицы А.",
    },
    {
      range: [37, 40],
      treasure: "3к6 драгоценных камней стоимостью 100 зм.",
      magic: "1к6 предметов из таблицы А.",
    },
    {
      range: [41, 44],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1к6 предметов из таблицы А.",
    },
    {
      range: [45, 49],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1к4 предметов из таблицы Б.",
    },
    {
      range: [50, 54],
      treasure: "3к6 драгоценных камней стоимостью 50 зм.",
      magic: "1к4 предметов из таблицы Б.",
    },
    {
      range: [55, 59],
      treasure: "3к6 драгоценных камней стоимостью 100 зм.",
      magic: "1к4 предметов из таблицы Б.",
    },
    {
      range: [60, 63],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1к4 предметов из таблицы Б.",
    },
    {
      range: [64, 66],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1к4 предметов из таблицы В.",
    },
    {
      range: [67, 69],
      treasure: "3к6 драгоценных камней стоимостью 50 зм.",
      magic: "1к4 предметов из таблицы В.",
    },
    {
      range: [70, 72],
      treasure: "3к6 драгоценных камней стоимостью 100 зм.",
      magic: "1к4 предметов из таблицы В.",
    },
    {
      range: [73, 74],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1к4 предметов из таблицы В.",
    },
    {
      range: [75, 76],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1 предмет из таблицы Г.",
    },
    {
      range: [77, 78],
      treasure: "3к6 драгоценных камней стоимостью 50 зм.",
      magic: "1 предмет из таблицы Г.",
    },
    {
      range: [79, 79],
      treasure: "3к6 драгоценных камней стоимостью 100 зм.",
      magic: "1 предмет из таблицы Г.",
    },
    {
      range: [80, 80],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1 предмет из таблицы Г.",
    },
    {
      range: [81, 84],
      treasure: "2к4 предметов искусства стоимостью 25 зм.",
      magic: "1к4 предметов из таблицы Е.",
    },
    {
      range: [85, 88],
      treasure: "3к6 драгоценных камней стоимостью 50 зм.",
      magic: "1к4 предметов из таблицы Е.",
    },
    {
      range: [89, 91],
      treasure: "3к6 драгоценных камней стоимостью 100 зм.",
      magic: "1к4 предметов из таблицы Е.",
    },
    {
      range: [92, 94],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1к4 предметов из таблицы Е.",
    },
    {
      range: [95, 96],
      treasure: "3к6 драгоценных камней стоимостью 100 зм.",
      magic: "1к4 предметов из таблицы Ё.",
    },
    {
      range: [97, 98],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1к4 предметов из таблицы Ё.",
    },
    {
      range: [99, 99],
      treasure: "3к6 драгоценных камней стоимостью 100 зм.",
      magic: "1 предмет из таблицы Ж.",
    },
    {
      range: [100, 100],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1 предмет из таблицы Ж.",
    },
  ],
  "11-16": [
    {
      range: [1, 3],
      treasure: "Без дополнительных драгоценностей и произведений искусства.",
    },
    { range: [4, 6], treasure: "2к4 предметов искусства стоимостью 250 зм." },
    { range: [7, 9], treasure: "2к4 предметов искусства стоимостью 750 зм." },
    { range: [10, 12], treasure: "3к6 драгоценных камней стоимостью 500 зм." },
    { range: [13, 15], treasure: "3к6 драгоценных камней стоимостью 1000 зм." },
    {
      range: [16, 19],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1к4 предметов из таблицы А и 1к6 предметов из таблицы Б.",
    },
    {
      range: [20, 23],
      treasure: "2к4 предметов искусства стоимостью 750 зм.",
      magic: "1к4 предметов из таблицы А и 1к6 предметов из таблицы Б.",
    },
    {
      range: [24, 26],
      treasure: "3к6 драгоценных камней стоимостью 500 зм.",
      magic: "1к4 предметов из таблицы А и 1к6 предметов из таблицы Б.",
    },
    {
      range: [27, 29],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к4 предметов из таблицы А и 1к6 предметов из таблицы Б.",
    },
    {
      range: [30, 35],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1к6 предметов из таблицы В.",
    },
    {
      range: [36, 40],
      treasure: "2к4 предметов искусства стоимостью 750 зм.",
      magic: "1к6 предметов из таблицы В.",
    },
    {
      range: [41, 45],
      treasure: "3к6 драгоценных камней стоимостью 500 зм.",
      magic: "1к6 предметов из таблицы В.",
    },
    {
      range: [46, 50],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к6 предметов из таблицы В.",
    },
    {
      range: [51, 54],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1к4 предметов из таблицы Г.",
    },
    {
      range: [55, 58],
      treasure: "2к4 предметов искусства стоимостью 750 зм.",
      magic: "1к4 предметов из таблицы Г.",
    },
    {
      range: [59, 62],
      treasure: "3к6 драгоценных камней стоимостью 500 зм.",
      magic: "1к4 предметов из таблицы Г.",
    },
    {
      range: [63, 66],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к4 предметов из таблицы Г.",
    },
    {
      range: [67, 68],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1 предмет из таблицы Д.",
    },
    {
      range: [69, 70],
      treasure: "2к4 предметов искусства стоимостью 750 зм.",
      magic: "1 предмет из таблицы Д.",
    },
    {
      range: [71, 72],
      treasure: "3к6 драгоценных камней стоимостью 500 зм.",
      magic: "1 предмет из таблицы Д.",
    },
    {
      range: [73, 74],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1 предмет из таблицы Д.",
    },
    {
      range: [75, 76],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1 предмет из таблицы Е и 1к4 предметов из таблицы Ё.",
    },
    {
      range: [77, 78],
      treasure: "2к4 предметов искусства стоимостью 750 зм.",
      magic: "1 предмет из таблицы Е и 1к4 предметов из таблицы Ё.",
    },
    {
      range: [79, 80],
      treasure: "3к6 драгоценных камней стоимостью 500 зм.",
      magic: "1 предмет из таблицы Е и 1к4 предметов из таблицы Ё.",
    },
    {
      range: [81, 82],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1 предмет из таблицы Е и 1к4 предметов из таблицы Ё.",
    },
    {
      range: [83, 85],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1к4 предметов из таблицы Ж.",
    },
    {
      range: [86, 88],
      treasure: "2к4 предметов искусства стоимостью 750 зм.",
      magic: "1к4 предметов из таблицы Ж.",
    },
    {
      range: [89, 90],
      treasure: "3к6 драгоценных камней стоимостью 500 зм.",
      magic: "1к4 предметов из таблицы Ж.",
    },
    {
      range: [91, 92],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к4 предметов из таблицы Ж.",
    },
    {
      range: [93, 94],
      treasure: "2к4 предметов искусства стоимостью 250 зм.",
      magic: "1 предмет из таблицы З.",
    },
    {
      range: [95, 96],
      treasure: "2к4 предметов искусства стоимостью 750 зм.",
      magic: "1 предмет из таблицы З.",
    },
    {
      range: [97, 98],
      treasure: "3к6 драгоценных камней стоимостью 500 зм.",
      magic: "1 предмет из таблицы З.",
    },
    {
      range: [99, 100],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1 предмет из таблицы З.",
    },
  ],
  "17+": [
    {
      range: [1, 2],
      treasure: "Без дополнительных драгоценностей и произведений искусства.",
    },
    {
      range: [3, 5],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к8 предметов из таблицы В.",
    },
    {
      range: [6, 8],
      treasure: "1к10 предметов искусства стоимостью 2500 зм.",
      magic: "1к8 предметов из таблицы В.",
    },
    {
      range: [9, 11],
      treasure: "1к4 предметов искусства стоимостью 7500 зм.",
      magic: "1к8 предметов из таблицы В.",
    },
    {
      range: [12, 14],
      treasure: "1к8 драгоценных камней стоимостью 5000 зм.",
      magic: "1к8 предметов из таблицы В.",
    },
    {
      range: [15, 22],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к6 предметов из таблицы Г.",
    },
    {
      range: [23, 30],
      treasure: "1к10 предметов искусства стоимостью 2500 зм.",
      magic: "1к6 предметов из таблицы Г.",
    },
    {
      range: [31, 38],
      treasure: "1к4 предметов искусства стоимостью 7500 зм.",
      magic: "1к6 предметов из таблицы Г.",
    },
    {
      range: [39, 46],
      treasure: "1к8 драгоценных камней стоимостью 5000 зм.",
      magic: "1к6 предметов из таблицы Г.",
    },
    {
      range: [47, 52],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к6 предметов из таблицы Д.",
    },
    {
      range: [53, 58],
      treasure: "1к10 предметов искусства стоимостью 2500 зм.",
      magic: "1к6 предметов из таблицы Д.",
    },
    {
      range: [59, 63],
      treasure: "1к4 предметов искусства стоимостью 7500 зм.",
      magic: "1к6 предметов из таблицы Д.",
    },
    {
      range: [64, 68],
      treasure: "1к8 драгоценных камней стоимостью 5000 зм.",
      magic: "1к6 предметов из таблицы Д.",
    },
    {
      range: [69, 69],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к4 предметов из таблицы Ё.",
    },
    {
      range: [70, 70],
      treasure: "1к10 предметов искусства стоимостью 2500 зм.",
      magic: "1к4 предметов из таблицы Ё.",
    },
    {
      range: [71, 71],
      treasure: "1к4 предметов искусства стоимостью 7500 зм.",
      magic: "1к4 предметов из таблицы Ё.",
    },
    {
      range: [72, 72],
      treasure: "1к8 драгоценных камней стоимостью 5000 зм.",
      magic: "1к4 предметов из таблицы Ё.",
    },
    {
      range: [73, 74],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к4 предметов из таблицы Ж.",
    },
    {
      range: [75, 76],
      treasure: "1к10 предметов искусства стоимостью 2500 зм.",
      magic: "1к4 предметов из таблицы Ж.",
    },
    {
      range: [77, 78],
      treasure: "1к4 предметов искусства стоимостью 7500 зм.",
      magic: "1к4 предметов из таблицы Ж.",
    },
    {
      range: [79, 80],
      treasure: "1к8 драгоценных камней стоимостью 5000 зм.",
      magic: "1к4 предметов из таблицы Ж.",
    },
    {
      range: [81, 85],
      treasure: "3к6 драгоценных камней стоимостью 1000 зм.",
      magic: "1к4 предметов из таблицы З.",
    },
    {
      range: [86, 90],
      treasure: "1к10 предметов искусства стоимостью 2500 зм.",
      magic: "1к4 предметов из таблицы З.",
    },
    {
      range: [91, 95],
      treasure: "1к4 предметов искусства стоимостью 7500 зм.",
      magic: "1к4 предметов из таблицы З.",
    },
    {
      range: [96, 100],
      treasure: "1к8 драгоценных камней стоимостью 5000 зм.",
      magic: "1к4 предметов из таблицы З.",
    },
  ],
};

const gemTables: Array<{ value: number; items: string[] }> = [
  {
    value: 10,
    items: [
      "Азурит",
      "Бирюза",
      "Гематит",
      "Глазчатый агат",
      "Голубой кварц",
      "Лазурит",
      "Малахит",
      "Моховой агат",
      "Обсидиан",
      "Полосчатый агат",
      "Родохрозит",
      "Тигровый глаз",
    ],
  },
  {
    value: 50,
    items: [
      "Гелиотроп",
      "Звёздчатый розовый кварц",
      "Кварц",
      "Лунный камень",
      "Оникс",
      "Сардоникс",
      "Сердолик",
      "Халцедон",
      "Хризопраз",
      "Циркон",
      "Цитрин",
      "Яшма",
    ],
  },
  {
    value: 100,
    items: [
      "Аметист",
      "Гагат",
      "Гранат",
      "Жемчуг",
      "Коралл",
      "Нефрит",
      "Турмалин",
      "Хризоберилл",
      "Шпинель",
      "Янтарь",
    ],
  },
  {
    value: 500,
    items: [
      "Аквамарин",
      "Александрит",
      "Синяя шпинель",
      "Топаз",
      "Хризолит",
      "Чёрный жемчуг",
    ],
  },
  {
    value: 1000,
    items: [
      "Голубой сапфир",
      "Жёлтый сапфир",
      "Огненный опал",
      "Опал",
      "Звёздчатый рубин",
      "Звёздчатый сапфир",
      "Изумруд",
      "Чёрный опал",
    ],
  },
];

const randomLootDefault: LootResult = {
  name: "Сокровищница по таблицам dnd.su",
  details:
    "Лут генерируется по таблицам статьи “Сокровищница”: индивидуальные монеты, сокровищница по ПО, реальные броски по магическим таблицам и ссылки на dnd.su.",
  link: treasuryArticleLink,
};

type MagicItemRoll = {
  range: [number, number];
  name: string;
};

const magicItemTableLinks: Record<string, string> = {
  А: treasuryArticleLink,
  Б: treasuryArticleLink,
  В: treasuryArticleLink,
  Г: treasuryArticleLink,
  Д: treasuryArticleLink,
  Е: treasuryArticleLink,
  Ё: treasuryArticleLink,
  Ж: treasuryArticleLink,
  З: treasuryArticleLink,
};

const magicItemDirectLinks: Record<string, string> = {
  "Зелье лечения": "https://dnd.su/items/61-potion-of-healing/",
  "Зелье большого лечения": "https://dnd.su/items/61-potion-of-healing/",
  "Зелье отличного лечения": "https://dnd.su/items/61-potion-of-healing/",
  "Зелье превосходного лечения": "https://dnd.su/items/61-potion-of-healing/",
  "Свиток заклинания (заговор)": "https://dnd.su/items/210-spell-scroll/",
  "Свиток заклинания (1 уровень)": "https://dnd.su/items/210-spell-scroll/",
  "Свиток заклинания (2 уровень)": "https://dnd.su/items/210-spell-scroll/",
  "Свиток заклинания (3 уровень)": "https://dnd.su/items/210-spell-scroll/",
  "Свиток заклинания (4 уровень)": "https://dnd.su/items/210-spell-scroll/",
  "Свиток заклинания (5 уровень)": "https://dnd.su/items/210-spell-scroll/",
  "Свиток заклинания (6 уровень)": "https://dnd.su/items/210-spell-scroll/",
  "Свиток заклинания (7 уровень)": "https://dnd.su/items/210-spell-scroll/",
  "Свиток заклинания (8 уровень)": "https://dnd.su/items/210-spell-scroll/",
  "Свиток заклинания (9 уровень)": "https://dnd.su/items/210-spell-scroll/",
  "Зелье лазания": "https://dnd.su/items/60-potion-of-climbing/",
  "Сумка хранения": "https://dnd.su/items/227-bag-of-holding/",
  "Парящая сфера": "https://dnd.su/items/165-driftglobe/",
  "Зелье огненного дыхания": "https://dnd.su/items/64-potion_of_fire_breath/",
  "Зелье сопротивления": "https://dnd.su/items/69-potion-of-resistance/",
  "Боеприпасы +1": "https://dnd.su/items/278-ammunition_1_2_3/",
  "Боеприпасы +2": "https://dnd.su/items/278-ammunition_1_2_3/",
  "Боеприпасы +3": "https://dnd.su/items/278-ammunition_1_2_3/",
  "Зелье дружбы с животными":
    "https://dnd.su/items/58-potion-of-animal-friendship/",
  "Зелье силы холмового великана":
    "https://dnd.su/items/67-potion_of_giant_strength/",
  "Зелье силы ледяного великана":
    "https://dnd.su/items/67-potion_of_giant_strength/",
  "Зелье силы каменного великана":
    "https://dnd.su/items/67-potion_of_giant_strength/",
  "Зелье силы огненного великана":
    "https://dnd.su/items/67-potion_of_giant_strength/",
  "Зелье силы облачного великана":
    "https://dnd.su/items/67-potion_of_giant_strength/",
  "Зелье силы штормового великана":
    "https://dnd.su/items/67-potion_of_giant_strength/",
  "Зелье увеличения": "https://dnd.su/items/70-potion-of-growth/",
  "Зелье подводного дыхания":
    "https://dnd.su/items/65-potion-of-water-breathing/",
  "Мазь Кеогтома": "https://dnd.su/items/126-keoghtoms-ointment/",
  "Масло ускользания": "https://dnd.su/items/134-oil-of-slipperiness/",
  "Порошок исчезновения": "https://dnd.su/items/182-dust-of-disappearance/",
  "Порошок сухости": "https://dnd.su/items/183-dust_of_dryness/",
  "Порошок чихания и удушья":
    "https://dnd.su/items/184-dust-of-sneezing-and-choking/",
  "Камень элементаля": "https://dnd.su/items/83-elemental_gem/",
  "Любовное зелье": "https://dnd.su/items/125-philter_of_love/",
  "Алхимический сосуд": "https://dnd.su/items/2-alchemy_jug/",
  "Шапка подводного дыхания":
    "https://dnd.su/items/249-cap_of_water_breathing/",
  "Плащ ската": "https://dnd.su/items/175-cloak_of_the_manta_ray/",
  "Ночные очки": "https://dnd.su/items/154-goggles_of_night/",
  "Шлем понимания языков":
    "https://dnd.su/items/251-helm_of_comprehending_languages/",
  "Неподвижный жезл": "https://dnd.su/items/153-immovable_rod/",
  "Фонарь обнаружения": "https://dnd.su/items/244-lantern_of_revealing/",
  "Доспех моряка": "https://dnd.su/items/35-mariners-armor/",
  "Мифрильный доспех": "https://dnd.su/items/148-mithral_armor/",
  "Зелье яда": "https://dnd.su/items/73-potion_of_poison/",
  "Кольцо плавания": "https://dnd.su/items/101-ring_of_swimming/",
  "Мантия полезных предметов": "https://dnd.su/items/130-robe-of-useful-items/",
  "Верёвка лазания": "https://dnd.su/items/13-rope_of_climbing/",
  "Седло кавалериста": "https://dnd.su/items/213-saddle_of_the_cavalier/",
  "Волшебная палочка обнаружения магии":
    "https://dnd.su/items/19-wand_of_magic_detection/",
  "Волшебная палочка секретов": "https://dnd.su/items/24-wand_of_secrets/",
  "Зелье ясновидения": "https://dnd.su/items/74-potion_of_clairvoyance/",
  "Зелье уменьшения": "https://dnd.su/items/71-potion-of-diminution/",
  "Зелье газообразной формы": "https://dnd.su/items/55-potion-of-gaseous-form/",
  "Зелье героизма": "https://dnd.su/items/56-potion_of_heroism/",
  "Зелье неуязвимости": "https://dnd.su/items/63-potion_of_invulnerability/",
  "Зелье чтения мыслей": "https://dnd.su/items/72-potion_of_mind_reading/",
  "Эликсир здоровья": "https://dnd.su/items/258-elixir_of_health/",
  "Масло эфирности": "https://dnd.su/items/135-oil-of-etherealness/",
  "Перо Кваля": "https://dnd.su/items/167-quaals-feather-token/",
  "Свиток защиты": "https://dnd.su/items/211-scroll_of_protection/",
  "Сумка с бобами": "https://dnd.su/items/225-bag-of-beans/",
  "Бусина силы": "https://dnd.su/items/10-bead-of-force/",
  "Колокольчик открывания": "https://dnd.su/items/91-chime-of-opening/",
  "Графин бесконечной воды":
    "https://dnd.su/items/30-decanter-of-endless-water/",
  "Очки детального зрения": "https://dnd.su/items/162-eyes-of-minute-seeing/",
  "Складная лодка": "https://dnd.su/items/216-folding-boat/",
  "Удобный рюкзак Хеварда": "https://dnd.su/items/242-hewards-handy-haversack/",
  "Подковы скорости": "https://dnd.su/items/180-horseshoes_of_speed/",
  "Ожерелье огненных шаров": "https://dnd.su/items/158-necklace-of-fireballs/",
  "Медальон здоровья": "https://dnd.su/items/139-periapt_of_health/",
  "Камни послания": "https://dnd.su/items/84-sending_stones/",
  "Зелье невидимости": "https://dnd.su/items/62-potion_of_invisibility/",
  "Зелье скорости": "https://dnd.su/items/68-potion_of_speed/",
  "Масло остроты": "https://dnd.su/items/133-oil_of_sharpness/",
  "Зелье полёта": "https://dnd.su/items/66-potion-of-flying/",
  "Зелье долголетия": "https://dnd.su/items/57-potion_of_longevity/",
  "Зелье живучести": "https://dnd.su/items/59-potion_of_vitality/",
  "Подковы ветра": "https://dnd.su/items/179-horseshoes-of-a-zephyr/",
  "Чудесные краски Нолзура":
    "https://dnd.su/items/247-nolzurs-marvelous-pigments/",
  "Сумка пожирания": "https://dnd.su/items/224-bag-of-devouring/",
};

const magicItemTables: Record<string, MagicItemRoll[]> = {
  А: [
    { range: [1, 50], name: "Зелье лечения" },
    { range: [51, 60], name: "Свиток заклинания (заговор)" },
    { range: [61, 70], name: "Зелье лазания" },
    { range: [71, 90], name: "Свиток заклинания (1 уровень)" },
    { range: [91, 94], name: "Свиток заклинания (2 уровень)" },
    { range: [95, 98], name: "Зелье большого лечения" },
    { range: [99, 99], name: "Сумка хранения" },
    { range: [100, 100], name: "Парящая сфера" },
  ],
  Б: [
    { range: [1, 15], name: "Зелье большого лечения" },
    { range: [16, 22], name: "Зелье огненного дыхания" },
    { range: [23, 29], name: "Зелье сопротивления" },
    { range: [30, 34], name: "Боеприпасы +1" },
    { range: [35, 39], name: "Зелье дружбы с животными" },
    { range: [40, 44], name: "Зелье силы холмового великана" },
    { range: [45, 49], name: "Зелье увеличения" },
    { range: [50, 54], name: "Зелье подводного дыхания" },
    { range: [55, 59], name: "Свиток заклинания (2 уровень)" },
    { range: [60, 64], name: "Свиток заклинания (3 уровень)" },
    { range: [65, 67], name: "Сумка хранения" },
    { range: [68, 70], name: "Мазь Кеогтома" },
    { range: [71, 73], name: "Масло ускользания" },
    { range: [74, 75], name: "Порошок исчезновения" },
    { range: [76, 77], name: "Порошок сухости" },
    { range: [78, 79], name: "Порошок чихания и удушья" },
    { range: [80, 81], name: "Камень элементаля" },
    { range: [82, 83], name: "Любовное зелье" },
    { range: [84, 84], name: "Алхимический сосуд" },
    { range: [85, 85], name: "Шапка подводного дыхания" },
    { range: [86, 86], name: "Плащ ската" },
    { range: [87, 87], name: "Парящая сфера" },
    { range: [88, 88], name: "Ночные очки" },
    { range: [89, 89], name: "Шлем понимания языков" },
    { range: [90, 90], name: "Неподвижный жезл" },
    { range: [91, 91], name: "Фонарь обнаружения" },
    { range: [92, 92], name: "Доспех моряка" },
    { range: [93, 93], name: "Мифрильный доспех" },
    { range: [94, 94], name: "Зелье яда" },
    { range: [95, 95], name: "Кольцо плавания" },
    { range: [96, 96], name: "Мантия полезных предметов" },
    { range: [97, 97], name: "Верёвка лазания" },
    { range: [98, 98], name: "Седло кавалериста" },
    { range: [99, 99], name: "Волшебная палочка обнаружения магии" },
    { range: [100, 100], name: "Волшебная палочка секретов" },
  ],
  В: [
    { range: [1, 15], name: "Зелье отличного лечения" },
    { range: [16, 22], name: "Свиток заклинания (4 уровень)" },
    { range: [23, 27], name: "Боеприпасы +2" },
    { range: [28, 32], name: "Зелье ясновидения" },
    { range: [33, 37], name: "Зелье уменьшения" },
    { range: [38, 42], name: "Зелье газообразной формы" },
    { range: [43, 47], name: "Зелье силы ледяного великана" },
    { range: [48, 52], name: "Зелье силы каменного великана" },
    { range: [53, 57], name: "Зелье героизма" },
    { range: [58, 62], name: "Зелье неуязвимости" },
    { range: [63, 67], name: "Зелье чтения мыслей" },
    { range: [68, 72], name: "Свиток заклинания (5 уровень)" },
    { range: [73, 75], name: "Эликсир здоровья" },
    { range: [76, 78], name: "Масло эфирности" },
    { range: [79, 81], name: "Зелье силы огненного великана" },
    { range: [82, 84], name: "Перо Кваля" },
    { range: [85, 87], name: "Свиток защиты" },
    { range: [88, 89], name: "Сумка с бобами" },
    { range: [90, 91], name: "Бусина силы" },
    { range: [92, 92], name: "Колокольчик открывания" },
    { range: [93, 93], name: "Графин бесконечной воды" },
    { range: [94, 94], name: "Очки детального зрения" },
    { range: [95, 95], name: "Складная лодка" },
    { range: [96, 96], name: "Удобный рюкзак Хеварда" },
    { range: [97, 97], name: "Подковы скорости" },
    { range: [98, 98], name: "Ожерелье огненных шаров" },
    { range: [99, 99], name: "Медальон здоровья" },
    { range: [100, 100], name: "Камни послания" },
  ],
  Г: [
    { range: [1, 20], name: "Зелье превосходного лечения" },
    { range: [21, 30], name: "Зелье невидимости" },
    { range: [31, 40], name: "Зелье скорости" },
    { range: [41, 50], name: "Свиток заклинания (6 уровень)" },
    { range: [51, 57], name: "Свиток заклинания (7 уровень)" },
    { range: [58, 62], name: "Боеприпасы +3" },
    { range: [63, 67], name: "Масло остроты" },
    { range: [68, 72], name: "Зелье полёта" },
    { range: [73, 77], name: "Зелье силы облачного великана" },
    { range: [78, 82], name: "Зелье долголетия" },
    { range: [83, 87], name: "Зелье живучести" },
    { range: [88, 92], name: "Свиток заклинания (8 уровень)" },
    { range: [93, 95], name: "Подковы ветра" },
    { range: [96, 98], name: "Чудесные краски Нолзура" },
    { range: [99, 99], name: "Сумка пожирания" },
    { range: [100, 100], name: "Переносная дыра" },
  ],
  Д: [
    { range: [1, 30], name: "Свиток заклинания (8 уровень)" },
    { range: [31, 55], name: "Зелье силы штормового великана" },
    { range: [56, 70], name: "Зелье превосходного лечения" },
    { range: [71, 85], name: "Свиток заклинания (9 уровень)" },
    { range: [86, 93], name: "Универсальный растворитель" },
    { range: [94, 98], name: "Стрела убийства" },
    { range: [99, 100], name: "Превосходный клей" },
  ],
  Е: [
    { range: [1, 15], name: "Оружие +1" },
    { range: [16, 18], name: "Щит +1" },
    { range: [19, 21], name: "Щит часового" },
    { range: [22, 23], name: "Амулет защиты от обнаружения и поиска" },
    { range: [24, 25], name: "Эльфийские сапоги" },
    { range: [26, 27], name: "Сапоги ходьбы и прыжков" },
    { range: [28, 29], name: "Наручи стрельбы из лука" },
    { range: [30, 31], name: "Брошь защиты" },
    { range: [32, 33], name: "Помело полёта" },
    { range: [34, 35], name: "Эльфийский плащ" },
    { range: [36, 37], name: "Плащ защиты" },
    { range: [38, 39], name: "Рукавицы силы огра" },
    { range: [40, 41], name: "Шапка маскировки" },
    { range: [42, 43], name: "Метательное копьё молнии" },
    { range: [44, 45], name: "Жемчужина силы" },
    { range: [46, 47], name: "Жезл хранителя договора +1" },
    { range: [48, 49], name: "Туфли паука" },
    { range: [50, 51], name: "Посох гадюки" },
    { range: [52, 53], name: "Посох питона" },
    { range: [54, 55], name: "Меч мести" },
    { range: [56, 57], name: "Трезубец командования рыбами" },
    { range: [58, 59], name: "Волшебная палочка снарядов" },
    { range: [60, 61], name: "Волшебная палочка боевого мага +1" },
    { range: [62, 63], name: "Волшебная палочка паутины" },
    { range: [64, 65], name: "Оружие предупреждения" },
    { range: [66, 66], name: "Адамантиновый доспех (кольчуга)" },
    { range: [67, 67], name: "Адамантиновый доспех (кольчужная рубаха)" },
    { range: [68, 68], name: "Адамантиновый доспех (чешуйчатый)" },
    { range: [69, 69], name: "Сумка фокусов (серая)" },
    { range: [70, 70], name: "Сумка фокусов (рыжая)" },
    { range: [71, 71], name: "Сумка фокусов (коричневая)" },
    { range: [72, 72], name: "Заполярные сапоги" },
    { range: [73, 73], name: "Обруч сжигания" },
    { range: [74, 74], name: "Колода иллюзий" },
    { range: [75, 75], name: "Вечнодымящаяся бутылка" },
    { range: [76, 76], name: "Очки очарования" },
    { range: [77, 77], name: "Очки орлиного зрения" },
    { range: [78, 78], name: "Статуэтка чудесной силы (серебряный ворон)" },
    { range: [79, 79], name: "Камень сияния" },
    { range: [80, 80], name: "Перчатки ловли снарядов" },
    { range: [81, 81], name: "Перчатки плавания и лазания" },
    { range: [82, 82], name: "Перчатки воровства" },
    { range: [83, 83], name: "Повязка интеллекта" },
    { range: [84, 84], name: "Шлем телепатии" },
    { range: [85, 85], name: "Инструмент бардов (лютня Досс)" },
    { range: [86, 86], name: "Инструмент бардов (бандура Фоклучан)" },
    { range: [87, 87], name: "Инструмент бардов (цитра Мак-Фуирми)" },
    { range: [88, 88], name: "Медальон мыслей" },
    { range: [89, 89], name: "Ожерелье адаптации" },
    { range: [90, 90], name: "Медальон затягивающихся ран" },
    { range: [91, 91], name: "Свирель ужаса" },
    { range: [92, 92], name: "Свирель канализации" },
    { range: [93, 93], name: "Кольцо прыжков" },
    { range: [94, 94], name: "Кольцо защиты разума" },
    { range: [95, 95], name: "Кольцо тепла" },
    { range: [96, 96], name: "Кольцо хождения по воде" },
    { range: [97, 97], name: "Колчан Элонны" },
    { range: [98, 98], name: "Камень удачи" },
    { range: [99, 99], name: "Веер ветра" },
    { range: [100, 100], name: "Крылатые сапоги" },
  ],
  Ё: [
    { range: [1, 11], name: "Оружие +2" },
    { range: [12, 14], name: "Статуэтка чудесной силы" },
    { range: [15, 15], name: "Адамантиновый доспех (кираса)" },
    { range: [16, 16], name: "Адамантиновый доспех (наборный)" },
    { range: [17, 17], name: "Амулет здоровья" },
    { range: [18, 18], name: "Доспех уязвимости" },
    { range: [19, 19], name: "Ловящий стрелы щит" },
    { range: [20, 20], name: "Пояс дварфов" },
    { range: [21, 21], name: "Пояс силы холмового великана" },
    { range: [22, 22], name: "Топор берсерка" },
    { range: [23, 23], name: "Сапоги левитации" },
    { range: [24, 24], name: "Сапоги скорости" },
    { range: [25, 25], name: "Чаша командования водяными элементалями" },
    { range: [26, 26], name: "Наручи защиты" },
    { range: [27, 27], name: "Жаровня командования огненными элементалями" },
    { range: [28, 28], name: "Плащ шарлатана" },
    { range: [29, 29], name: "Кадило контролирования воздушных элементалей" },
    { range: [30, 30], name: "Доспех +1 (кольчуга)" },
    { range: [31, 31], name: "Доспех сопротивления (кольчуга)" },
    { range: [32, 32], name: "Доспех +1 (кольчужная рубаха)" },
    { range: [33, 33], name: "Доспех сопротивления (кольчужная рубаха)" },
    { range: [34, 34], name: "Плащ ускользания" },
    { range: [35, 35], name: "Плащ летучей мыши" },
    { range: [36, 36], name: "Куб силового поля" },
    { range: [37, 37], name: "Мгновенная крепость Даэрна" },
    { range: [38, 38], name: "Кинжал яда" },
    { range: [39, 39], name: "Оковы измерений" },
    { range: [40, 40], name: "Убийца драконов" },
    { range: [41, 41], name: "Эльфийская кольчуга" },
    { range: [42, 42], name: "Язык пламени" },
    { range: [43, 43], name: "Камень зрения" },
    { range: [44, 44], name: "Убийца великанов" },
    { range: [45, 45], name: "Красивый проклёпанный кожаный доспех" },
    { range: [46, 46], name: "Шлем телепортации" },
    { range: [47, 47], name: "Рог взрыва" },
    { range: [48, 48], name: "Рог Валгаллы (серебряный или латунный)" },
    { range: [49, 49], name: "Инструмент бардов (мандолина Канаит)" },
    { range: [50, 50], name: "Инструмент бардов (лира Кли)" },
    { range: [51, 51], name: "Камень Йоун (восприятие)" },
    { range: [52, 52], name: "Камень Йоун (защита)" },
    { range: [53, 53], name: "Камень Йоун (резерв)" },
    { range: [54, 54], name: "Камень Йоун (питание)" },
    { range: [55, 55], name: "Железные ленты Биларро" },
    { range: [56, 56], name: "Доспех +1 (кожаный)" },
    { range: [57, 57], name: "Доспех сопротивления (кожаный)" },
    { range: [58, 58], name: "Булава распада" },
    { range: [59, 59], name: "Булава кары" },
    { range: [60, 60], name: "Булава ужаса" },
    { range: [61, 61], name: "Мантия сопротивления заклинаниям" },
    { range: [62, 62], name: "Ожерелье молитвенных чёток" },
    { range: [63, 63], name: "Медальон защиты от яда" },
    { range: [64, 64], name: "Кольцо влияния на животных" },
    { range: [65, 65], name: "Кольцо уклонения" },
    { range: [66, 66], name: "Кольцо падения пёрышком" },
    { range: [67, 67], name: "Кольцо свободных действий" },
    { range: [68, 68], name: "Кольцо защиты" },
    { range: [69, 69], name: "Кольцо сопротивления" },
    { range: [70, 70], name: "Кольцо хранения заклинаний" },
    { range: [71, 71], name: "Кольцо тарана" },
    { range: [72, 72], name: "Кольцо проникающего зрения" },
    { range: [73, 73], name: "Мантия глаз" },
    { range: [74, 74], name: "Жезл правления" },
    { range: [75, 75], name: "Жезл хранителя договора +2" },
    { range: [76, 76], name: "Верёвка опутывания" },
    { range: [77, 77], name: "Доспех +1 (чешуйчатый)" },
    { range: [78, 78], name: "Доспех сопротивления (чешуйчатый)" },
    { range: [79, 79], name: "Щит +2" },
    { range: [80, 80], name: "Щит притягивания снарядов" },
    { range: [81, 81], name: "Посох очарования" },
    { range: [82, 82], name: "Посох лечения" },
    { range: [83, 83], name: "Посох роя насекомых" },
    { range: [84, 84], name: "Посох леса" },
    { range: [85, 85], name: "Посох иссушения" },
    { range: [86, 86], name: "Камень контролирования земляных элементалей" },
    { range: [87, 87], name: "Солнечный клинок" },
    { range: [88, 88], name: "Меч кражи жизни" },
    { range: [89, 89], name: "Меч ранения" },
    { range: [90, 90], name: "Жезл щупалец" },
    { range: [91, 91], name: "Жестокое оружие" },
    { range: [92, 92], name: "Волшебная палочка сковывания" },
    { range: [93, 93], name: "Волшебная палочка обнаружения врагов" },
    { range: [94, 94], name: "Волшебная палочка страха" },
    { range: [95, 95], name: "Волшебная палочка огненных шаров" },
    { range: [96, 96], name: "Волшебная палочка молний" },
    { range: [97, 97], name: "Волшебная палочка паралича" },
    { range: [98, 98], name: "Волшебная палочка боевого мага +2" },
    { range: [99, 99], name: "Волшебная палочка чудес" },
    { range: [100, 100], name: "Крылья полёта" },
  ],
  Ж: [
    { range: [1, 10], name: "Оружие +3" },
    { range: [11, 12], name: "Амулет планов" },
    { range: [13, 14], name: "Ковёр-самолёт" },
    { range: [15, 16], name: "Хрустальный шар (очень редкая версия)" },
    { range: [17, 18], name: "Кольцо регенерации" },
    { range: [19, 20], name: "Кольцо падающих звёзд" },
    { range: [21, 22], name: "Кольцо телекинеза" },
    { range: [23, 24], name: "Мантия сияющих цветов" },
    { range: [25, 26], name: "Мантия звёзд" },
    { range: [27, 28], name: "Жезл поглощения" },
    { range: [29, 30], name: "Жезл бдительности" },
    { range: [31, 32], name: "Жезл безопасности" },
    { range: [33, 34], name: "Жезл хранителя договора +3" },
    { range: [35, 36], name: "Скимитар скорости" },
    { range: [37, 38], name: "Щит +3" },
    { range: [39, 40], name: "Посох огня" },
    { range: [41, 42], name: "Посох мороза" },
    { range: [43, 44], name: "Посох силы" },
    { range: [45, 46], name: "Посох ударов" },
    { range: [47, 48], name: "Посох грома и молнии" },
    { range: [49, 50], name: "Меч остроты" },
    { range: [51, 52], name: "Волшебная палочка превращения" },
    { range: [53, 54], name: "Волшебная палочка боевого мага +3" },
    { range: [55, 55], name: "Адамантиновый доспех (полулаты)" },
    { range: [56, 56], name: "Адамантиновый доспех (латы)" },
    { range: [57, 57], name: "Живой щит" },
    { range: [58, 58], name: "Пояс силы огненного великана" },
    { range: [59, 59], name: "Пояс силы ледяного великана (или каменного)" },
    { range: [60, 60], name: "Доспех +1 (кираса)" },
    { range: [61, 61], name: "Доспех сопротивления (кираса)" },
    { range: [62, 62], name: "Свеча мольбы" },
    { range: [63, 63], name: "Доспех +2 (кольчуга)" },
    { range: [64, 64], name: "Доспех +2 (кольчужная рубаха)" },
    { range: [65, 65], name: "Плащ паука" },
    { range: [66, 66], name: "Танцующий меч" },
    { range: [67, 67], name: "Демонический доспех" },
    { range: [68, 68], name: "Доспех из драконьей чешуи" },
    { range: [69, 69], name: "Латы дварфов" },
    { range: [70, 70], name: "Дварфский метатель" },
    { range: [71, 71], name: "Бутылка с ифритом" },
    { range: [72, 72], name: "Статуэтка чудесной силы (обсидиановый скакун)" },
    { range: [73, 73], name: "Морозный клинок" },
    { range: [74, 74], name: "Шлем блеска" },
    { range: [75, 75], name: "Рог Валгаллы (бронзовый)" },
    { range: [76, 76], name: "Инструмент бардов (арфа Анструт)" },
    { range: [77, 77], name: "Камень Йоун (поглощение)" },
    { range: [78, 78], name: "Камень Йоун (проворство)" },
    { range: [79, 79], name: "Камень Йоун (стойкость)" },
    { range: [80, 80], name: "Камень Йоун (проницательность)" },
    { range: [81, 81], name: "Камень Йоун (рассудок)" },
    { range: [82, 82], name: "Камень Йоун (лидерство)" },
    { range: [83, 83], name: "Камень Йоун (сила)" },
    { range: [84, 84], name: "Доспех +2 (кожаный)" },
    { range: [85, 85], name: "Справочник телесного здоровья" },
    { range: [86, 86], name: "Справочник полезных упражнений" },
    { range: [87, 87], name: "Справочник по големам" },
    { range: [88, 88], name: "Справочник быстроты действий" },
    { range: [89, 89], name: "Зеркало похищения жизни" },
    { range: [90, 90], name: "Вор девяти жизней" },
    { range: [91, 91], name: "Лук клятвы" },
    { range: [92, 92], name: "Доспех +2 (чешуйчатый)" },
    { range: [93, 93], name: "Щит от заклинаний" },
    { range: [94, 94], name: "Доспех +1 (наборный)" },
    { range: [95, 95], name: "Доспех сопротивления (наборный)" },
    { range: [96, 96], name: "Доспех +1 (проклёпанный кожаный)" },
    { range: [97, 97], name: "Доспех сопротивления (проклёпанный кожаный)" },
    { range: [98, 98], name: "Том чистых мыслей" },
    { range: [99, 99], name: "Том лидерства и влияния" },
    { range: [100, 100], name: "Том понимания" },
  ],
  З: [
    { range: [1, 5], name: "Защитник" },
    { range: [6, 10], name: "Молот грома" },
    { range: [11, 15], name: "Клинок удачи" },
    { range: [16, 20], name: "Меч ответа" },
    { range: [21, 23], name: "Святой мститель" },
    { range: [24, 26], name: "Кольцо призыва джинна" },
    { range: [27, 29], name: "Кольцо невидимости" },
    { range: [30, 32], name: "Кольцо отражения заклинаний" },
    { range: [33, 35], name: "Жезл величественной мощи" },
    { range: [36, 38], name: "Посох магов" },
    { range: [39, 41], name: "Меч головоруб" },
    { range: [42, 43], name: "Пояс силы облачного великана" },
    { range: [44, 45], name: "Доспех +2 (кираса)" },
    { range: [46, 47], name: "Доспех +3 (кольчуга)" },
    { range: [48, 49], name: "Доспех +3 (кольчужная рубаха)" },
    { range: [50, 51], name: "Плащ невидимости" },
    { range: [52, 53], name: "Хрустальный шар (легендарная версия)" },
    { range: [54, 55], name: "Доспех +1 (полулаты)" },
    { range: [56, 57], name: "Железная фляга" },
    { range: [58, 59], name: "Доспех +3 (кожаный)" },
    { range: [60, 61], name: "Доспех +1 (латы)" },
    { range: [62, 63], name: "Мантия архимага" },
    { range: [64, 65], name: "Жезл воскрешения" },
    { range: [66, 67], name: "Доспех +1 (чешуйчатый)" },
    { range: [68, 69], name: "Скарабей защиты" },
    { range: [70, 71], name: "Доспех +2 (наборный)" },
    { range: [72, 73], name: "Доспех +2 (проклёпанная кожа)" },
    { range: [74, 75], name: "Колодец многих миров" },
    { range: [76, 76], name: "Магический доспех" },
    { range: [77, 77], name: "Аппарат Квалиша" },
    { range: [78, 78], name: "Доспех неуязвимости" },
    { range: [79, 79], name: "Пояс силы великана (штормовой)" },
    { range: [80, 80], name: "Куб врат" },
    { range: [81, 81], name: "Колода многих вещей" },
    { range: [82, 82], name: "Кольчуга ифритов" },
    { range: [83, 83], name: "Доспех сопротивления (полулаты)" },
    { range: [84, 84], name: "Рог Валгаллы (железный)" },
    { range: [85, 85], name: "Инструмент бардов (арфа Оллава)" },
    { range: [86, 86], name: "Камень Йоун (большое поглощение)" },
    { range: [87, 87], name: "Камень Йоун (мастерство)" },
    { range: [88, 88], name: "Камень Йоун (регенерация)" },
    { range: [89, 89], name: "Латный доспех эфирности" },
    { range: [90, 90], name: "Доспех сопротивления (латы)" },
    { range: [91, 91], name: "Кольцо командования воздушными элементалями" },
    { range: [92, 92], name: "Кольцо командования земляными элементалями" },
    { range: [93, 93], name: "Кольцо командования огненными элементалями" },
    { range: [94, 94], name: "Кольцо трёх желаний" },
    { range: [95, 95], name: "Кольцо командования водяными элементалями" },
    { range: [96, 96], name: "Сфера аннигиляции" },
    { range: [97, 97], name: "Талисман чистого добра" },
    { range: [98, 98], name: "Талисман сферы" },
    { range: [99, 99], name: "Талисман абсолютного зла" },
    { range: [100, 100], name: "Том молчаливого языка" },
  ],
};

const initialTokens: RoomToken[] = [
  {
    id: "elira",
    name: "Элира",
    short: "Э",
    kind: "player",
    color: "rgb(34 211 238)",
    x: 2,
    y: 4,
    hp: 28,
    maxHp: 32,
    ac: 15,
    speed: 30,
    owner: "Игрок",
    roleOwner: "player",
    sheetId: "sheet-elira",
    visionRadius: 3,
    statuses: ["blessed"],
  },
  {
    id: "borin",
    name: "Борин",
    short: "Б",
    kind: "player",
    color: "rgb(251 191 36)",
    x: 4,
    y: 5,
    hp: 41,
    maxHp: 41,
    ac: 18,
    speed: 25,
    owner: "Игрок",
    roleOwner: "player",
    sheetId: "sheet-borin",
    visionRadius: 3,
    statuses: ["concentrating"],
  },
  {
    id: "goblin",
    name: "Гоблин-разведчик",
    short: "G",
    kind: "monster",
    color: "rgb(244 63 94)",
    x: 11,
    y: 4,
    hp: 7,
    maxHp: 7,
    ac: 13,
    speed: 30,
    owner: "GM",
    roleOwner: "gm",
    gmOnly: true,
    statuses: ["poisoned"],
  },
  {
    id: "table-1",
    name: "Стол",
    short: "⌂",
    kind: "object",
    color: "rgb(168 85 247)",
    x: 8,
    y: 6,
    hp: 0,
    maxHp: 0,
    ac: 12,
    speed: 0,
    owner: "GM",
    roleOwner: "gm",
    statuses: [],
  },
];

const initialSheets: CharacterSheet[] = [
  {
    id: "sheet-elira",
    tokenId: "elira",
    name: "Элира Найтбриз",
    race: "Эльф",
    heroClass: "Wizard",
    subclass: "School of Evocation",
    level: 4,
    experience: 6200,
    hp: 28,
    maxHp: 32,
    ac: 15,
    speed: 30,
    stats: { str: 8, dex: 14, con: 12, int: 18, wis: 13, cha: 10 },
    notes: "Ищет скрытый архив башни и избегает ближнего боя.",
    inventory: "Arcane focus, Potion of Healing, Explorer pack",
    spells: "Magic Missile, Shield, Misty Step",
    classLevels: [{ classId: "Wizard", level: 4 }],
    selectedSubclassId: "evocation",
    knownSpellIds: ["magic-missile", "shield", "misty-step"],
    takenFeatIds: ["observant"],
    resources: {
      spellSlots: [
        { current: 4, max: 4 },
        { current: 3, max: 3 },
        { current: 2, max: 2 },
      ],
      hitDice: { current: 4, max: 4 },
      sorceryPoints: { current: 0, max: 0 },
      rage: { current: 0, max: 0 },
      ki: { current: 0, max: 0 },
      deathSaves: { successes: 0, failures: 0 },
      exhaustion: 0,
    },
  },
  {
    id: "sheet-borin",
    tokenId: "borin",
    name: "Борин Стоунхарт",
    race: "Дварф",
    heroClass: "Fighter",
    subclass: "Champion",
    level: 4,
    experience: 6600,
    hp: 41,
    maxHp: 41,
    ac: 18,
    speed: 25,
    stats: { str: 18, dex: 10, con: 16, int: 9, wis: 12, cha: 8 },
    notes: "Держит переднюю линию и прикрывает Элиру щитом.",
    inventory: "Battleaxe, Shield, Rope 50 ft",
    spells: "",
    classLevels: [{ classId: "Fighter", level: 4 }],
    selectedSubclassId: "champion",
    takenFeatIds: ["heavy-armor-master"],
    resources: {
      spellSlots: [
        { current: 0, max: 0 },
        { current: 0, max: 0 },
        { current: 0, max: 0 },
      ],
      hitDice: { current: 4, max: 4 },
      rage: { current: 0, max: 0 },
      ki: { current: 0, max: 0 },
      sorceryPoints: { current: 0, max: 0 },
      deathSaves: { successes: 0, failures: 0 },
      exhaustion: 0,
    },
  },
];

const silkMainHallId = "silk-main-hall";

const silkThroneLocations: SilkLocation[] = [
  {
    id: silkMainHallId,
    name: "Главный салон / Зал Белой Вуали",
    atmosphere: "Вино, духи, сигары, тёплый свет и музыка за шёлковыми ширмами.",
    usualGuests: "Знать, гости, Верена, Валлис, Освин, Марчел.",
    sceneGoal: "Главный публичный узел: тост, слухи и первые политические удары.",
    rewards: "Первые слухи фракций, реакция дома, зацепки на все ветки.",
    danger: "Любая реплика становится политическим заявлением на весь дом.",
    terrainPreset: "wood",
    texturePreset: "tiles",
    npcs: [
      { name: "Верена", short: "ВЕ", kind: "npc", color: "rgb(236 72 153)", hp: 32, maxHp: 32, ac: 15, speed: 30 },
      { name: "Валлис", short: "ВА", kind: "npc", color: "rgb(59 130 246)", hp: 30, maxHp: 30, ac: 14, speed: 30 },
      { name: "Освин Дрейк", short: "ОС", kind: "npc", color: "rgb(245 158 11)", hp: 38, maxHp: 38, ac: 16, speed: 30 },
      { name: "Марчел", short: "МА", kind: "npc", color: "rgb(168 85 247)", hp: 29, maxHp: 29, ac: 14, speed: 30 },
      { name: "Мирон", short: "МИ", kind: "npc", color: "rgb(14 165 233)", hp: 22, maxHp: 22, ac: 13, speed: 30 },
    ],
  },
  {
    id: "silk-morrow-laundry",
    name: "Закрытая прачечная Морроу",
    atmosphere: "Сырость, старое мыло, мокрая ткань и свеча над картой дома.",
    usualGuests: "Арвена Морроу и её люди.",
    sceneGoal: "Экспозиция, улики и общий заход в ночь.",
    rewards: "Карта дома, маски входа и первое понимание фракций.",
    danger: "Морроу на грани срыва и толкает в силовой сценарий.",
    terrainPreset: "stone",
    texturePreset: "moss",
    npcs: [
      { name: "Арвена Морроу", short: "АМ", kind: "npc", color: "rgb(248 113 113)", hp: 42, maxHp: 42, ac: 16, speed: 30, statuses: ["exhausted"] },
    ],
  },
  {
    id: "silk-white-gloves-lobby",
    name: "Вестибюль белых перчаток",
    atmosphere: "Холодные зеркала, серебряные подносы и камердинеры.",
    usualGuests: "Охрана, камердинеры, новые гости.",
    sceneGoal: "Проверка легенд входа и метки подозрения.",
    rewards: "Первое впечатление дома и понимание, как он «читает» гостей.",
    danger: "Провал маски ведёт к почти немедленному сопровождению охраной.",
    terrainPreset: "stone",
    texturePreset: "tiles",
    npcs: [{ name: "Старший камердинер", short: "СК", kind: "npc", color: "rgb(226 232 240)", hp: 18, maxHp: 18, ac: 13, speed: 30 }],
  },
  {
    id: "silk-mirror-gallery",
    name: "Зеркальная галерея",
    atmosphere: "Свечи, длинные зеркала, сухое шампанское и лилии.",
    usualGuests: "Валлис, знать и придворные гости.",
    sceneGoal: "Разговор о порядке, архиве и компромате.",
    rewards: "Протоколы, допуск знати и связи с домами.",
    danger: "Стабильность продаётся как «разумная» грязь.",
    terrainPreset: "stone",
    texturePreset: "tiles",
    npcs: [{ name: "Валлис", short: "ВА", kind: "npc", color: "rgb(59 130 246)", hp: 30, maxHp: 30, ac: 14, speed: 30 }],
  },
  {
    id: "silk-jasmine-baths",
    name: "Жасминовые купальни",
    atmosphere: "Тёплый пар, жасмин, масла и мрамор.",
    usualGuests: "Верена, банщицы и богатые клиенты.",
    sceneGoal: "Линия нейтралитета дома, эксплуатации и выживания.",
    rewards: "Внутренние маршруты и помощь слуг.",
    danger: "Мягкая подача скрывает цену чужой слабости.",
    terrainPreset: "water",
    texturePreset: "sand",
    npcs: [{ name: "Верена", short: "ВЕ", kind: "npc", color: "rgb(236 72 153)", hp: 32, maxHp: 32, ac: 15, speed: 30 }],
  },
  {
    id: "silk-winter-garden",
    name: "Зимний сад под тёплым стеклом",
    atmosphere: "Влажное тепло, растения, склянки, настойки и купол.",
    usualGuests: "Феррейн, аптекари, зависимые гости.",
    sceneGoal: "Дурманы, фальшивое лечение и рынок боли.",
    rewards: "Яды, антидоты, клиентские журналы.",
    danger: "Прагматичная мерзость легко нормализуется.",
    terrainPreset: "grass",
    texturePreset: "moss",
    npcs: [{ name: "Феррейн", short: "ФЕ", kind: "npc", color: "rgb(34 197 94)", hp: 27, maxHp: 27, ac: 13, speed: 30 }],
  },
  {
    id: "silk-velvet-chapel",
    name: "Бархатная часовня",
    atmosphere: "Решётка исповеди, ладан и тёплый красноватый свет.",
    usualGuests: "Марчел, послушники культа, сломанные гости.",
    sceneGoal: "Культ Масок: стыд, признание и подчинение.",
    rewards: "Личные тайны и культовые связи.",
    danger: "Из слабости делают поводок.",
    terrainPreset: "earth",
    texturePreset: "blood",
    npcs: [{ name: "Марчел", short: "МА", kind: "npc", color: "rgb(168 85 247)", hp: 29, maxHp: 29, ac: 14, speed: 30 }],
  },
  {
    id: "silk-cigar-room",
    name: "Сигарная комната",
    atmosphere: "Тёмное дерево, густой дым, бренди, карты и расписки.",
    usualGuests: "Освин Дрейк, Чёрная Сеть, телохранители.",
    sceneGoal: "Переговоры о рынке, долгах и перевозках.",
    rewards: "Деньги, поддельные бумаги и криминальная логистика.",
    danger: "Выгода затмевает моральную цену сделки.",
    terrainPreset: "wood",
    texturePreset: "sand",
    npcs: [{ name: "Освин Дрейк", short: "ОС", kind: "npc", color: "rgb(245 158 11)", hp: 38, maxHp: 38, ac: 16, speed: 30 }],
  },
  {
    id: "silk-cold-pantry",
    name: "Холодная кладовая на служебной лестнице",
    atmosphere: "Камень, уголь, кровь на рукаве и связки ключей.",
    usualGuests: "Арвена Морроу, изгнанники, раненые союзники.",
    sceneGoal: "Показать надлом Морроу без официальной маски.",
    rewards: "Ключи и план силового захвата.",
    danger: "Легко перейти от правосудия к расправе.",
    terrainPreset: "stone",
    texturePreset: "rubble",
    npcs: [{ name: "Арвена Морроу", short: "АМ", kind: "npc", color: "rgb(248 113 113)", hp: 42, maxHp: 42, ac: 16, speed: 30, statuses: ["restrained"] }],
  },
  {
    id: "silk-laundry-basement",
    name: "Прачечный подвал",
    atmosphere: "Щёлок, мокрое бельё, плач и узкие проходы.",
    usualGuests: "Сера, прачки, слуги и сломанные люди дома.",
    sceneGoal: "Показать цену роскоши через живых людей.",
    rewards: "Нижние маршруты и касса побега.",
    danger: "Сцена ломает моральную дистанцию.",
    terrainPreset: "water",
    texturePreset: "blood",
    npcs: [{ name: "Сера", short: "СЕ", kind: "npc", color: "rgb(16 185 129)", hp: 24, maxHp: 24, ac: 12, speed: 30 }],
  },
  {
    id: "silk-silver-box-2",
    name: "Серебряный бокс №2",
    atmosphere: "Душный кабинет, чай, хрусталь и перегородка.",
    usualGuests: "Энна Вейл, Хейм, судья Рей или люди давления.",
    sceneGoal: "Разговор о ложных показаниях и выживании.",
    rewards: "Живой свидетель и прямые связки по делу Морроу.",
    danger: "Потеря Энны ломает линию живой правды.",
    terrainPreset: "wood",
    texturePreset: "tiles",
    npcs: [{ name: "Энна Вейл", short: "ЭВ", kind: "npc", color: "rgb(125 211 252)", hp: 15, maxHp: 15, ac: 11, speed: 30, statuses: ["stunned"] }],
  },
  {
    id: "silk-side-gallery",
    name: "Боковая галерея",
    atmosphere: "Полутень, быстрые шаги, служебные двери и переходы.",
    usualGuests: "Мирон, слуги, бегущие посредники.",
    sceneGoal: "Погоня и перехват перед полуночным узлом.",
    rewards: "След к Красному кабинету и папки Мирона.",
    danger: "Сцена уходит в хаос и потери времени.",
    terrainPreset: "stone",
    texturePreset: "rubble",
    npcs: [{ name: "Мирон", short: "МИ", kind: "npc", color: "rgb(14 165 233)", hp: 22, maxHp: 22, ac: 13, speed: 30 }],
  },
  {
    id: "silk-card-catalog",
    name: "Комната карт / картотечная",
    atmosphere: "Бумага, пыль, шкафы и шифровальные пластины.",
    usualGuests: "Мирон, писцы, люди архива.",
    sceneGoal: "Коды, шифры и скрытые записи.",
    rewards: "Пластины, ключи, карточки гостей, часть архива.",
    danger: "Упущение комнаты делает финал грязнее.",
    terrainPreset: "earth",
    texturePreset: "sand",
    npcs: [{ name: "Старший писец", short: "ПС", kind: "npc", color: "rgb(196 181 253)", hp: 16, maxHp: 16, ac: 11, speed: 30 }],
  },
  {
    id: "silk-service-routes",
    name: "Служебные коридоры и лестницы",
    atmosphere: "Узко, темно, пахнет углём, потом и бельём.",
    usualGuests: "Слуги, Сера, люди Верены, курьеры.",
    sceneGoal: "Скрытые переходы между сценами и побеги.",
    rewards: "Тайные маршруты и быстрый доступ к комнатам.",
    danger: "Легко потерять свидетеля или врезаться в охрану.",
    terrainPreset: "stone",
    texturePreset: "moss",
    npcs: [{ name: "Служебный курьер", short: "КР", kind: "npc", color: "rgb(251 191 36)", hp: 14, maxHp: 14, ac: 12, speed: 35 }],
  },
  {
    id: "silk-carriage-arch",
    name: "Каретная арка / выезд из дома",
    atmosphere: "Камень, колёса, ночной воздух и тени экипажей.",
    usualGuests: "Курьеры, охрана, люди на вывоз.",
    sceneGoal: "Побег, эвакуация и передача людей наружу.",
    rewards: "Спасение свидетеля и вывоз архива.",
    danger: "Кто контролирует арку, решает судьбу рассвета.",
    terrainPreset: "stone",
    texturePreset: "rubble",
    npcs: [{ name: "Капитан выезда", short: "КВ", kind: "npc", color: "rgb(148 163 184)", hp: 26, maxHp: 26, ac: 15, speed: 30 }],
  },
  {
    id: "silk-red-cabinet",
    name: "Красный кабинет",
    atmosphere: "Шёлк, сейф, тишина и тяжёлый стол завещания.",
    usualGuests: "Финально — все, кто дожил и дошёл.",
    sceneGoal: "Кульминация: завещание, архив и выбор наследника.",
    rewards: "Право назвать хозяина дома и полный архив.",
    danger: "Здесь рушатся союзы и начинается финальная схватка.",
    terrainPreset: "wood",
    texturePreset: "blood",
    npcs: [{ name: "Баронский нотариус", short: "НТ", kind: "npc", color: "rgb(239 68 68)", hp: 21, maxHp: 21, ac: 13, speed: 30 }],
  },
];

function createCell(): CellData {
  return {
    terrain: DEFAULT_TERRAIN,
    terrainPreset: "stone",
    obstacle: null,
    obstacleScale: "full",
    obstacleAnchor: "center",
    obstaclePreset: undefined,
    texture: null,
    texturePreset: undefined,
    furniture: null,
    furnitureScale: "full",
    furnitureAnchor: "center",
    furniturePreset: undefined,
    furnitureVariant: "wood",
    fog: false,
  };
}

function getStampStyle(
  scale: "full" | "half" | "quarter" = "full",
  anchor: "center" | "tl" | "tr" | "bl" | "br" = "center",
): CSSProperties {
  if (scale === "full") return { inset: "12%" };

  const size = scale === "half" ? "50%" : "25%";
  if (anchor === "center") {
    return {
      width: size,
      height: size,
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const inset = "14%";
  const style: CSSProperties = { width: size, height: size };
  if (anchor.includes("t")) style.top = inset;
  if (anchor.includes("b")) style.bottom = inset;
  if (anchor.includes("l")) style.left = inset;
  if (anchor.includes("r")) style.right = inset;
  return style;
}

function findBrushColor<
  T extends ReadonlyArray<{ id: string; color: string }>,
>(catalog: T, id: string | undefined, fallback: string) {
  return catalog.find((item) => item.id === id)?.color ?? fallback;
}

function getTerrainBackground(cell: CellData): CSSProperties {
  const preset = cell.terrainPreset;
  if (preset === "water") {
    return {
      backgroundColor: "#1d4ed8",
      backgroundImage:
        "repeating-radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0 5px, transparent 5px 13px)",
    };
  }
  if (preset === "wood") {
    return {
      backgroundColor: "#92400e",
      backgroundImage:
        "repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0 3px, rgba(0,0,0,0.08) 3px 10px)",
    };
  }
  if (preset === "earth") {
    return {
      backgroundColor: "#7c2d12",
      backgroundImage:
        "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.1), transparent 40%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.2), transparent 45%)",
    };
  }
  if (preset === "grass") {
    return {
      backgroundColor: "#166534",
      backgroundImage:
        "repeating-linear-gradient(65deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 6px)",
    };
  }
  return {
    backgroundColor: cell.terrain,
    backgroundImage:
      "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.09), transparent 35%), radial-gradient(circle at 80% 70%, rgba(15,23,42,0.24), transparent 42%)",
  };
}

function getTextureOverlay(cell: CellData): CSSProperties | null {
  if (!cell.texture && !cell.texturePreset) return null;
  if (cell.texturePreset === "moss") {
    return {
      backgroundImage:
        "radial-gradient(circle, rgba(34,197,94,0.35) 0 30%, transparent 35%)",
      backgroundSize: "12px 12px",
    };
  }
  if (cell.texturePreset === "rubble") {
    return {
      backgroundImage:
        "repeating-linear-gradient(130deg, rgba(161,161,170,0.5) 0 2px, transparent 2px 8px)",
    };
  }
  if (cell.texturePreset === "sand") {
    return {
      backgroundImage:
        "radial-gradient(circle, rgba(250,204,21,0.35) 0 20%, transparent 24%)",
      backgroundSize: "8px 8px",
    };
  }
  if (cell.texturePreset === "blood") {
    return {
      backgroundImage:
        "radial-gradient(circle at 35% 40%, rgba(220,38,38,0.6), transparent 36%), radial-gradient(circle at 65% 65%, rgba(153,27,27,0.5), transparent 30%)",
    };
  }
  if (cell.texturePreset === "tiles") {
    return {
      backgroundImage:
        "linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)",
      backgroundSize: "10px 10px",
    };
  }
  return {
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent 0 7px, currentColor 7px 9px)",
    color: cell.texture ?? "#22c55e",
    mixBlendMode: "screen",
  };
}

function createEmptyMap(cols: number, rows: number) {
  return Array.from({ length: cols * rows }, createCell);
}

function createInitialMapState(): MapState {
  return {
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    publicTiles: createEmptyMap(DEFAULT_COLS, DEFAULT_ROWS),
    gmTiles: createEmptyMap(DEFAULT_COLS, DEFAULT_ROWS),
  };
}

function buildSilkLocationMapState(location: SilkLocation): MapState {
  const cols = DEFAULT_COLS;
  const rows = DEFAULT_ROWS;
  const publicTiles = createEmptyMap(cols, rows).map((cell) => ({
    ...cell,
    terrainPreset: location.terrainPreset,
    texturePreset: location.texturePreset,
    terrain: findBrushColor(terrainBrushes, location.terrainPreset, DEFAULT_TERRAIN),
  }));
  const gmTiles = publicTiles.map((cell, index) => {
    const x = index % cols;
    const y = Math.floor(index / cols);
    const borderCell = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
    return {
      ...cell,
      obstacle: borderCell ? "rgba(241,245,249,0.6)" : cell.obstacle,
      obstaclePreset: borderCell ? "wood-wall" : cell.obstaclePreset,
      obstacleScale: borderCell ? "full" : cell.obstacleScale,
      furniture:
        x >= 5 && x <= 10 && y >= 3 && y <= 6 && (x + y) % 2 === 0
          ? "rgba(251,191,36,0.5)"
          : cell.furniture,
      furniturePreset:
        x >= 5 && x <= 10 && y >= 3 && y <= 6 && (x + y) % 2 === 0
          ? "table"
          : cell.furniturePreset,
      furnitureScale:
        x >= 5 && x <= 10 && y >= 3 && y <= 6 && (x + y) % 2 === 0
          ? "quarter"
          : cell.furnitureScale,
    };
  });

  return { cols, rows, publicTiles, gmTiles };
}

function buildSilkNpcTokens(location: SilkLocation): RoomToken[] {
  return location.npcs.map((npc, index) => {
    const x = 6 + (index % 3) * 2;
    const y = 4 + Math.floor(index / 3);
    return {
      id: `silk-npc-${location.id}-${index}`,
      name: npc.name,
      short: npc.short,
      kind: npc.kind,
      color: npc.color,
      x,
      y,
      hp: npc.hp,
      maxHp: npc.maxHp,
      ac: npc.ac,
      speed: npc.speed,
      owner: "GM",
      roleOwner: "gm",
      statuses: npc.statuses ?? [],
      mapId: location.id,
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nowTime() {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date());
}

function rollFormula(formula: string) {
  const match = formula.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) return null;

  const count = Number(match[1] || 1);
  const sides = Number(match[2]);
  const modifier = Number(match[3] || 0);

  if (count < 1 || count > 20 || sides < 2 || sides > 1000) return null;

  const rolls = Array.from(
    { length: count },
    () => Math.floor(Math.random() * sides) + 1,
  );
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

  return { count, sides, modifier, rolls, total };
}

function rollDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDiceExpression(expression: string) {
  const match = expression.match(/(\d+)к(\d+)/i);
  if (!match) return 1;

  const count = Number(match[1]);
  const sides = Number(match[2]);
  return Array.from({ length: count }, () => rollDie(sides)).reduce(
    (sum, roll) => sum + roll,
    0,
  );
}

function rollGemItems(treasureText: string) {
  const countMatch = treasureText.match(
    /(\d+к\d+)\s+драгоценных камней стоимостью (\d+) зм/i,
  );
  if (!countMatch) return [];

  const count = rollDiceExpression(countMatch[1]);
  const value = Number(countMatch[2]);
  const gemBucket = gemTables.find((entry) => entry.value === value);
  if (!gemBucket) return [];

  return Array.from(
    { length: count },
    () => gemBucket.items[Math.floor(Math.random() * gemBucket.items.length)],
  );
}

function rollMagicItemFromTable(letter: string) {
  const table = magicItemTables[letter];
  if (!table?.length) return null;

  const roll = rollDie(100);
  const match = table.find(
    (entry) => roll >= entry.range[0] && roll <= entry.range[1],
  );
  if (!match) return null;
  const directLink =
    magicItemDirectLinks[match.name] ?? magicItemTableLinks[letter];

  if (letter === "Ё" && match.name === "Статуэтка чудесной силы") {
    const statueRoll = rollDie(8);
    const statueName =
      statueRoll === 1
        ? "Статуэтка чудесной силы (бронзовый грифон)"
        : statueRoll === 2
          ? "Статуэтка чудесной силы (эбеновая муха)"
          : statueRoll === 3
            ? "Статуэтка чудесной силы (золотые львы)"
            : statueRoll === 4
              ? "Статуэтка чудесной силы (костяные козлы)"
              : statueRoll === 5
                ? "Статуэтка чудесной силы (мраморный слон)"
                : statueRoll <= 7
                  ? "Статуэтка чудесной силы (ониксовая собака)"
                  : "Статуэтка чудесной силы (серпентиновая сова)";

    return {
      table: letter,
      roll,
      name: `${statueName}, доп. бросок к8: ${statueRoll}`,
      link: magicItemTableLinks[letter],
    };
  }

  if (
    letter === "Ж" &&
    match.name === "Пояс силы ледяного великана (или каменного)"
  ) {
    const variant =
      rollDie(2) === 1
        ? "Пояс силы ледяного великана"
        : "Пояс силы каменного великана";
    return {
      table: letter,
      roll,
      name: variant,
      link: magicItemDirectLinks[variant] ?? magicItemTableLinks[letter],
    };
  }

  if (letter === "З" && match.name === "Магический доспех") {
    const armorRoll = rollDie(12);
    const armorName =
      armorRoll <= 2
        ? "Доспех +2 (полулаты)"
        : armorRoll <= 4
          ? "Доспех +2 (латы)"
          : armorRoll <= 6
            ? "Доспех +3 (проклёпанная кожа)"
            : armorRoll <= 8
              ? "Доспех +3 (кираса)"
              : armorRoll <= 10
                ? "Доспех +3 (наборный)"
                : armorRoll === 11
                  ? "Доспех +3 (полулаты)"
                  : "Доспех +3 (латы)";

    return {
      table: letter,
      roll,
      name: `${armorName}, доп. бросок к12: ${armorRoll}`,
      link: magicItemDirectLinks[armorName] ?? magicItemTableLinks[letter],
    };
  }

  return { table: letter, roll, name: match.name, link: directLink };
}

function rollMagicFromReference(reference: string) {
  const normalized = reference
    .replace("таблицы", "таблица")
    .replace("таблицу", "таблица");
  const parts = normalized.split(" и ").map((part) => part.trim());
  const results: Array<{
    table: string;
    roll: number;
    name: string;
    link: string;
  }> = [];

  for (const part of parts) {
    const match =
      part.match(
        /(?:(\d+к\d+)|(\d+))\s+предмет(?:ов)?\s+из\s+таблица\s+([А-ЗЁ])/i,
      ) ??
      part.match(
        /(?:(\d+к\d+)|(\d+))\s+предмет(?:ов)?\s+из\s+таблицы\s+([А-ЗЁ])/i,
      );
    if (!match) continue;

    const count = match[1]
      ? rollDiceExpression(match[1])
      : Number(match[2] || 1);
    const letter = match[3].toUpperCase();

    for (let index = 0; index < count; index += 1) {
      const item = rollMagicItemFromTable(letter);
      if (item) results.push(item);
    }
  }

  return results;
}

function rollTreasureFromTables(crBand: LootCrBand): LootResult {
  const d100 = rollDie(100);
  const individualCoins =
    treasureCoinTables[crBand].find(
      (entry) => d100 >= entry.range[0] && d100 <= entry.range[1],
    ) ?? treasureCoinTables[crBand][0];
  const hoardRow =
    hoardTables[crBand].find(
      (entry) => d100 >= entry.range[0] && d100 <= entry.range[1],
    ) ?? hoardTables[crBand][0];
  const rolledGems = rollGemItems(hoardRow.treasure);
  const magicItems = hoardRow.magic
    ? rollMagicFromReference(hoardRow.magic)
    : [];

  return {
    name: `Клад по таблице ПО ${crBand}`,
    details: [
      `Бросок к100: ${d100}.`,
      `Монеты сокровищницы: ${hoardCoinTables[crBand].join(", ")}.`,
      `Индивидуальные монеты для этой же группы ПО: ${individualCoins.coins.join(", ")}.`,
      `Строка сокровищницы: ${hoardRow.treasure}`,
      hoardRow.magic
        ? `Магические предметы: ${hoardRow.magic}`
        : "Магические предметы: без дополнительных бросков.",
      magicItems.length
        ? `Реальные броски по таблицам dnd.su: ${magicItems.map((item) => `${item.table}${String(item.roll).padStart(2, "0")} → ${item.name}`).join("; ")}.`
        : "",
      rolledGems.length ? `Выпавшие камни: ${rolledGems.join(", ")}.` : "",
      "Источник: таблицы статьи “Сокровищница” на dnd.su.",
    ].join(" "),
    link: treasuryArticleLink,
    rolledMagicItems: magicItems,
    rolledGems,
  };
}

function getCellIndex(x: number, y: number, cols: number) {
  return y * cols + x;
}

function cellCoordinate(x: number, y: number) {
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

function getTokenInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "P";
}

function hexFromColorString(color: string) {
  if (color.startsWith("#")) return color;
  const match = color.match(/rgb\((\d+)\s+(\d+)\s+(\d+)\)/i);
  if (!match) return "#fbbf24";
  return `#${match
    .slice(1)
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function buildRumorTable(prompt: string) {
  const topic = prompt.trim() || "город на грани неприятностей";
  const normalizedTopic = topic.replace(/[.!?]+$/u, "");
  const lowerTopic = normalizedTopic.toLowerCase();

  return [
    `Говорят, что в районе ${normalizedTopic} по ночам скупают старые карты и долговые расписки, словно кто-то готовит тихий передел влияния.`,
    `В трактирах шепчутся, что местная стража получила негласный приказ не вмешиваться в дела, связанные с ${lowerTopic}, до особого сигнала сверху.`,
    `Купцы уверяют, будто история про ${lowerTopic} — лишь ширма: настоящий интерес вызывает человек, который внезапно начал щедро платить за молчание свидетелей.`,
    `Среди ремесленников ползёт слух, что из-за ${lowerTopic} скоро подорожают редкие припасы, а значит кто-то заранее копит ресурсы перед крупным событием.`,
    `Самые суеверные клянутся, что ${lowerTopic} уже влияет на настроение всего города: люди чаще ссорятся, пропадают гонцы и даже храмовые служители выглядят настороженно.`,
  ];
}

function readNestedString(source: unknown, paths: string[][], fallback = "") {
  if (!source || typeof source !== "object") return fallback;

  for (const path of paths) {
    let current: unknown = source;
    let found = true;

    for (const key of path) {
      if (!current || typeof current !== "object" || !(key in current)) {
        found = false;
        break;
      }
      current = (current as Record<string, unknown>)[key];
    }

    if (!found) continue;
    if (typeof current === "string" && current.trim()) return current;
    if (typeof current === "number") return String(current);
  }

  return fallback;
}

function readNestedNumber(source: unknown, paths: string[][], fallback = 10) {
  const value = readNestedString(source, paths, String(fallback));
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function readDocumentText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value
      .map((item) => readDocumentText(item))
      .filter(Boolean)
      .join("\n");
  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;

  if (typeof record.text === "string") return record.text;
  if (record.value) return readDocumentText(record.value);
  if (record.data) return readDocumentText(record.data);
  if (Array.isArray(record.content)) {
    return record.content
      .map((item) => readDocumentText(item))
      .filter(Boolean)
      .join(record.type === "paragraph" ? "" : "\n");
  }

  return "";
}

function normalizeMultiline(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function extractStats(
  stats: Record<string, unknown> | undefined,
): CharacterStats {
  return {
    str: Number(
      (stats?.str as Record<string, unknown> | undefined)?.score ?? 10,
    ),
    dex: Number(
      (stats?.dex as Record<string, unknown> | undefined)?.score ?? 10,
    ),
    con: Number(
      (stats?.con as Record<string, unknown> | undefined)?.score ?? 10,
    ),
    int: Number(
      (stats?.int as Record<string, unknown> | undefined)?.score ?? 10,
    ),
    wis: Number(
      (stats?.wis as Record<string, unknown> | undefined)?.score ?? 10,
    ),
    cha: Number(
      (stats?.cha as Record<string, unknown> | undefined)?.score ?? 10,
    ),
  };
}

function parseLongStoryShortCharacter(
  raw: unknown,
): Partial<CharacterSheet> | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const embeddedRaw = typeof source.data === "string" ? source.data : null;
  let embedded: Record<string, unknown> | null = null;

  if (embeddedRaw) {
    try {
      embedded = JSON.parse(embeddedRaw) as Record<string, unknown>;
    } catch {
      embedded = null;
    }
  }

  const root = embedded ?? source;
  const info =
    (root.info as Record<string, { value?: unknown }> | undefined) ?? {};
  const subInfo =
    (root.subInfo as Record<string, { value?: unknown }> | undefined) ?? {};
  const vitality =
    (root.vitality as Record<string, { value?: unknown }> | undefined) ?? {};
  const textBlocks =
    (root.text as Record<string, { value?: unknown }> | undefined) ?? {};
  const avatar =
    (root.avatar as Record<string, unknown> | undefined) ??
    (source.avatar as Record<string, unknown> | undefined);
  const speed = Number(
    vitality["speed"]?.value ??
      readNestedNumber(raw, [["speed"], ["movement", "walk"]], 30),
  );
  const hp = Number(
    vitality["hp-current"]?.value ??
      readNestedNumber(
        raw,
        [["hp"], ["hitPoints", "current"], ["health", "current"]],
        10,
      ),
  );
  const maxHp = Number(
    vitality["hp-max"]?.value ??
      readNestedNumber(
        raw,
        [["maxHp"], ["hitPoints", "max"], ["health", "max"]],
        hp,
      ),
  );

  const notesParts = [
    normalizeMultiline(readDocumentText(textBlocks.background?.value)),
    normalizeMultiline(readDocumentText(textBlocks.features?.value)),
  ].filter(Boolean);

  return {
    name: String(
      (root.name as { value?: unknown } | undefined)?.value ??
        readNestedString(
          raw,
          [["name"], ["characterName"], ["character", "name"]],
          "Новый персонаж",
        ),
    ),
    race: String(
      info.race?.value ??
        readNestedString(
          raw,
          [["race"], ["ancestry"], ["species"]],
          "Не указано",
        ),
    ),
    heroClass: String(
      info.charClass?.value ??
        readNestedString(
          raw,
          [["class"], ["heroClass"], ["characterClass"]],
          "Adventurer",
        ),
    ),
    subclass: String(info.charSubclass?.value ?? ""),
    background: String(info.background?.value ?? ""),
    alignment: String(info.alignment?.value ?? ""),
    playerName: String(info.playerName?.value ?? ""),
    level: Number(
      info.level?.value ??
        readNestedNumber(raw, [["level"], ["character", "level"]], 1),
    ),
    experience: Number(info.experience?.value ?? 0),
    hp,
    maxHp,
    ac: Number(
      vitality["ac"]?.value ??
        readNestedNumber(raw, [["ac"], ["armorClass"]], 10),
    ),
    speed,
    initiative: Number(vitality["initiative"]?.value ?? 0),
    proficiencyBonus: Number(root.proficiency ?? 0),
    stats: extractStats(root.stats as Record<string, unknown> | undefined),
    age: String(subInfo.age?.value ?? ""),
    height: String(subInfo.height?.value ?? ""),
    weight: String(subInfo.weight?.value ?? ""),
    eyes: String(subInfo.eyes?.value ?? ""),
    skin: String(subInfo.skin?.value ?? ""),
    hair: String(subInfo.hair?.value ?? ""),
    avatarUrl:
      typeof avatar?.webp === "string"
        ? avatar.webp
        : typeof avatar?.jpeg === "string"
          ? avatar.jpeg
          : undefined,
    spells: normalizeMultiline(
      readDocumentText(textBlocks.traits?.value) ||
        readNestedString(raw, [["spellsText"], ["spells"]], ""),
    ),
    inventory: normalizeMultiline(
      readDocumentText(textBlocks.equipment?.value) ||
        readNestedString(
          raw,
          [["inventoryText"], ["inventory"], ["equipment"]],
          "",
        ),
    ),
    notes:
      notesParts.join("\n\n") ||
      readNestedString(
        raw,
        [["notes"], ["backstory"], ["description"]],
        "Импортировано из Long Story Short.",
      ),
    appearance: normalizeMultiline(
      readDocumentText(textBlocks.appearance?.value),
    ),
    personality: normalizeMultiline(
      readDocumentText(textBlocks.personality?.value),
    ),
    ideals: normalizeMultiline(readDocumentText(textBlocks.ideals?.value)),
    bonds: normalizeMultiline(readDocumentText(textBlocks.bonds?.value)),
    flaws: normalizeMultiline(readDocumentText(textBlocks.flaws?.value)),
    allies: normalizeMultiline(readDocumentText(textBlocks.allies?.value)),
    proficiencies: normalizeMultiline(readDocumentText(textBlocks.prof?.value)),
    traits: normalizeMultiline(readDocumentText(textBlocks.traits?.value)),
    equipmentDetails: normalizeMultiline(
      readDocumentText(textBlocks.equipment?.value),
    ),
    attacks: normalizeMultiline(readDocumentText(textBlocks.attacks?.value)),
    feats: normalizeMultiline(readDocumentText(textBlocks.feats?.value)),
    features: normalizeMultiline(readDocumentText(textBlocks.features?.value)),
  };
}

function getPlayerTokens(tokens: RoomToken[]) {
  return tokens.filter((token) => token.kind === "player");
}

function isCellVisibleToPlayers(x: number, y: number, tokens: RoomToken[]) {
  const playerTokens = tokens.filter((token) => token.kind === "player");
  return playerTokens.some((token) => {
    const radius = token.visionRadius ?? 3;
    return Math.abs(token.x - x) + Math.abs(token.y - y) <= radius;
  });
}

function createEmptyInitiativeState(): InitiativeState {
  return {
    active: false,
    round: 1,
    currentTurnIndex: 0,
    participants: [],
  };
}

function normalizeToken(token: RoomToken): RoomToken {
  return {
    ...token,
    statuses: Array.isArray(token.statuses)
      ? Array.from(new Set(token.statuses))
      : [],
  };
}

function getStatusMeta(status: TokenStatusKey) {
  return tokenStatusCatalog.find((item) => item.key === status);
}

function getInitiativeModifier(token: RoomToken, sheets: CharacterSheet[]) {
  const sheet = sheets.find(
    (entry) => entry.tokenId === token.id || entry.id === token.sheetId,
  );
  if (
    typeof sheet?.initiative === "number" &&
    Number.isFinite(sheet.initiative) &&
    sheet.initiative !== 0
  ) {
    return sheet.initiative;
  }

  const dex = sheet?.stats.dex;
  if (typeof dex === "number" && Number.isFinite(dex)) {
    return Math.floor((dex - 10) / 2);
  }

  return 0;
}

function syncInitiativeWithTokens(
  initiative: InitiativeState,
  tokens: RoomToken[],
  sheets: CharacterSheet[],
) {
  const participants = initiative.participants
    .map((participant) => {
      const token = tokens.find((entry) => entry.id === participant.tokenId);
      if (!token) return null;

      return {
        ...participant,
        name: token.name,
        kind: token.kind,
        color: token.color,
        hiddenFromPlayers: token.gmOnly,
        initiativeModifier: getInitiativeModifier(token, sheets),
      };
    })
    .filter(Boolean) as InitiativeParticipant[];

  const currentTurnIndex =
    participants.length === 0
      ? 0
      : Math.min(initiative.currentTurnIndex, participants.length - 1);

  return {
    ...initiative,
    active: initiative.active && participants.length > 0,
    currentTurnIndex,
    participants,
  };
}

function resizeTiles(
  source: CellData[],
  oldCols: number,
  oldRows: number,
  newCols: number,
  newRows: number,
) {
  const nextTiles = createEmptyMap(newCols, newRows);

  for (let y = 0; y < Math.min(oldRows, newRows); y += 1) {
    for (let x = 0; x < Math.min(oldCols, newCols); x += 1) {
      nextTiles[getCellIndex(x, y, newCols)] =
        source[getCellIndex(x, y, oldCols)] ?? createCell();
    }
  }

  return nextTiles;
}

function AdaptiveLabel({
  full,
  short,
  icon = "…",
  className,
}: {
  full: string;
  short: string;
  icon?: string;
  className?: string;
}) {
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  useEffect(() => {
    const node = labelRef.current;
    if (!node) return;
    const updateOverflow = () => {
      setIsOverflow(node.scrollWidth > node.clientWidth);
    };
    updateOverflow();
    const resizeObserver = new ResizeObserver(() => updateOverflow());
    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, [full, short, icon]);

  return (
    <span
      ref={labelRef}
      className={`adaptive-label ${isOverflow ? "adaptive-label--overflow" : ""} ${className ?? ""}`.trim()}
      title={full}
      aria-label={full}
    >
      <span className="adaptive-label__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="adaptive-label__short">{short}</span>
      <span className="adaptive-label__full">{full}</span>
    </span>
  );
}

function CompactSection({
  title,
  description,
  badge,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      className={`arcane-panel group overflow-hidden ${className ?? ""}`}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 marker:content-none">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="panel-text-truncate text-base font-semibold text-parchment-100" title={title} data-icon="📌">{title}</h2>
            {badge ? <span className="badge panel-text-truncate border-ember-300/30 bg-ember-400/10 text-ember-200" title={badge} data-icon="🏷️">{badge}</span> : null}
          </div>
          {description ? (
            <p className="panel-text-truncate mt-1 text-sm text-slate-400" title={description} data-icon="📝">{description}</p>
          ) : null}
        </div>
        <span className="panel-text-truncate rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition group-open:rotate-180" title="Развернуть / свернуть" data-icon="⌄">
          ⌄
        </span>
      </summary>
      <div className="border-t border-white/8 px-4 py-4">{children}</div>
    </details>
  );
}

function boardButtonClass(isActive: boolean) {
  return `rounded-full border px-3 py-2 text-sm transition ${isActive ? "border-ember-300/60 bg-ember-400/15 text-ember-100 shadow-ember-glow" : "border-white/10 text-slate-300 hover:border-rune-400/40 hover:text-white"}`;
}

const statLabels: Array<{ key: keyof CharacterStats; label: string }> = [
  { key: "str", label: "СИЛ" },
  { key: "dex", label: "ЛОВ" },
  { key: "con", label: "ТЕЛ" },
  { key: "int", label: "ИНТ" },
  { key: "wis", label: "МДР" },
  { key: "cha", label: "ХАР" },
];

function createDefaultStats(): CharacterStats {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
}

function createDefaultResources(): CharacterResources {
  return {
    spellSlots: [
      { current: 2, max: 2 },
      { current: 0, max: 0 },
      { current: 0, max: 0 },
    ],
    hitDice: { current: 1, max: 1 },
    rage: { current: 0, max: 0 },
    ki: { current: 0, max: 0 },
    sorceryPoints: { current: 0, max: 0 },
    deathSaves: { successes: 0, failures: 0 },
    exhaustion: 0,
  };
}

function normalizeResources(
  resources?: CharacterResources,
): CharacterResources {
  const defaults = createDefaultResources();
  const slots = Array.from({ length: 3 }, (_, index) => {
    const current = resources?.spellSlots?.[index];
    const fallback = defaults.spellSlots?.[index] ?? { current: 0, max: 0 };
    return {
      current: Number.isFinite(current?.current)
        ? Number(current?.current)
        : fallback.current,
      max: Number.isFinite(current?.max) ? Number(current?.max) : fallback.max,
    };
  });

  return {
    spellSlots: slots,
    hitDice: {
      current: Number.isFinite(resources?.hitDice?.current)
        ? Number(resources?.hitDice?.current)
        : defaults.hitDice!.current,
      max: Number.isFinite(resources?.hitDice?.max)
        ? Number(resources?.hitDice?.max)
        : defaults.hitDice!.max,
    },
    rage: {
      current: Number.isFinite(resources?.rage?.current)
        ? Number(resources?.rage?.current)
        : defaults.rage!.current,
      max: Number.isFinite(resources?.rage?.max)
        ? Number(resources?.rage?.max)
        : defaults.rage!.max,
    },
    ki: {
      current: Number.isFinite(resources?.ki?.current)
        ? Number(resources?.ki?.current)
        : defaults.ki!.current,
      max: Number.isFinite(resources?.ki?.max)
        ? Number(resources?.ki?.max)
        : defaults.ki!.max,
    },
    sorceryPoints: {
      current: Number.isFinite(resources?.sorceryPoints?.current)
        ? Number(resources?.sorceryPoints?.current)
        : defaults.sorceryPoints!.current,
      max: Number.isFinite(resources?.sorceryPoints?.max)
        ? Number(resources?.sorceryPoints?.max)
        : defaults.sorceryPoints!.max,
    },
    deathSaves: {
      successes: Number.isFinite(resources?.deathSaves?.successes)
        ? Number(resources?.deathSaves?.successes)
        : defaults.deathSaves!.successes,
      failures: Number.isFinite(resources?.deathSaves?.failures)
        ? Number(resources?.deathSaves?.failures)
        : defaults.deathSaves!.failures,
    },
    exhaustion: Number.isFinite(resources?.exhaustion)
      ? Number(resources?.exhaustion)
      : defaults.exhaustion!,
  };
}

function getAbilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function formatSignedModifier(modifier: number) {
  return `${modifier >= 0 ? "+" : ""}${modifier}`;
}

function getSpellcastingAbility(sheet: CharacterSheet): keyof CharacterStats {
  const heroClass = sheet.heroClass.toLowerCase();
  if (["wizard", "artificer"].some((name) => heroClass.includes(name)))
    return "int";
  if (
    ["cleric", "druid", "ranger", "monk"].some((name) =>
      heroClass.includes(name),
    )
  )
    return "wis";
  if (
    ["bard", "paladin", "sorcerer", "warlock"].some((name) =>
      heroClass.includes(name),
    )
  )
    return "cha";
  return "int";
}

function getResourceLabel(
  resourceKey: "hitDice" | "rage" | "ki" | "sorceryPoints",
) {
  return {
    hitDice: "кости хитов",
    rage: "ярость",
    ki: "ки",
    sorceryPoints: "очки чародейства",
  }[resourceKey];
}

function createEmptyCharacterSheet(
  id: string,
  tokenId: string,
  name: string,
): CharacterSheet {
  return {
    id,
    tokenId,
    name,
    race: "Human",
    heroClass: "Adventurer",
    level: 1,
    hp: 12,
    maxHp: 12,
    ac: 12,
    speed: 30,
    stats: createDefaultStats(),
    notes: "Создано игроком в комнате.",
    inventory: "",
    spells: "",
    resources: createDefaultResources(),
  };
}

function characterSections(sheet: CharacterSheet) {
  return [
    { title: "Описание", value: sheet.appearance },
    { title: "Личность", value: sheet.personality },
    { title: "Идеалы", value: sheet.ideals },
    { title: "Привязанности", value: sheet.bonds },
    { title: "Слабости", value: sheet.flaws },
    { title: "Союзники и связи", value: sheet.allies },
    { title: "Владения и языки", value: sheet.proficiencies },
    { title: "Черты и формы", value: sheet.traits },
    { title: "Снаряжение", value: sheet.equipmentDetails || sheet.inventory },
    { title: "Атаки и расовые заметки", value: sheet.attacks },
    { title: "Черты/feat", value: sheet.feats },
    { title: "Особенности", value: sheet.features },
    { title: "Заклинания", value: sheet.spells },
    { title: "Инвентарь", value: sheet.inventory },
    { title: "Заметки", value: sheet.notes },
  ].filter((section) => section.value);
}

function Board({
  boardId,
  title,
  subtitle,
  cols,
  rows,
  tiles,
  tokens,
  zoom,
  showZoomOverlay,
  onZoomOut,
  onZoomIn,
  onZoomChange,
  onZoomFit,
  onReturnToMain,
  showReturnToMain,
  visibleMask,
  onBoardPointerDown,
  onTokenPointerDown,
  activeTokenId,
}: {
  boardId: string;
  title: string;
  subtitle: string;
  cols: number;
  rows: number;
  tiles: CellData[];
  tokens: RoomToken[];
  zoom: number;
  showZoomOverlay?: boolean;
  onZoomOut?: () => void;
  onZoomIn?: () => void;
  onZoomChange?: (value: number) => void;
  onZoomFit?: () => void;
  onReturnToMain?: () => void;
  showReturnToMain?: boolean;
  visibleMask?: boolean[];
  onBoardPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTokenPointerDown?: (
    tokenId: string,
  ) => (event: ReactPointerEvent<HTMLButtonElement>) => void;
  activeTokenId?: string | null;
}) {
  const aspectRatio = `${cols} / ${rows}`;
  const minWidth = Math.max(600, cols * 44);

  return (
    <div className="arcane-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Тактическая карта</div>
          <h2 className="mt-1 text-lg font-semibold text-parchment-100">{title}</h2>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <span className="badge border-rune-400/30 bg-rune-500/10 text-rune-100">
          {cols}×{rows}
        </span>
      </div>

      <div className="overflow-auto rounded-3xl border border-white/10 bg-ink-950/80 p-3 shadow-inner">
        <div className="relative">
          {showZoomOverlay ? (
            <div className="absolute right-2 top-2 z-20 flex items-center gap-2 rounded-2xl border border-white/15 bg-ink-950/90 px-2 py-2 shadow-rune-glow backdrop-blur">
              <button
                type="button"
                onClick={onZoomOut}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-100 transition hover:border-rune-400/50"
              >
                −
              </button>
              <input
                type="range"
                min="20"
                max="180"
                value={Math.round(zoom * 100)}
                onChange={(event) => onZoomChange?.(Number(event.target.value) / 100)}
                className="w-24"
              />
              <button
                type="button"
                onClick={onZoomIn}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-100 transition hover:border-rune-400/50"
              >
                +
              </button>
              <button
                type="button"
                onClick={onZoomFit}
                className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-200 transition hover:border-rune-400/50"
              >
                fit
              </button>
              {showReturnToMain ? (
                <button
                  type="button"
                  onClick={onReturnToMain}
                  className="rounded-lg border border-emerald-300/30 px-2 py-1 text-[11px] text-emerald-200 transition hover:border-emerald-300/70"
                >
                  main
                </button>
              ) : null}
            </div>
          ) : null}
          <div
            id={boardId}
            onPointerDown={onBoardPointerDown}
            className="relative touch-none select-none overflow-hidden rounded-3xl border border-white/10 bg-slate-900"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            aspectRatio,
            minWidth,
          }}
        >
          {Array.from({ length: cols * rows }, (_, index) => {
            const x = index % cols;
            const y = Math.floor(index / cols);
            const cell = tiles[index] ?? createCell();
            const isVisible = visibleMask ? visibleMask[index] : true;
            const textureOverlay = getTextureOverlay(cell);
            return (
              <div
                key={`${title}-${x}-${y}`}
                className="relative"
                style={getTerrainBackground(cell)}
              >
                {textureOverlay ? (
                  <div
                    className="absolute inset-0 opacity-55"
                    style={{
                      ...textureOverlay,
                      backgroundPosition: `${x * 10}px ${y * 10}px`,
                    }}
                  />
                ) : null}
                {cell.obstacle ? (
                  <div
                    className="absolute flex items-center justify-center rounded-md border-2 opacity-90"
                    style={{
                      ...getStampStyle(cell.obstacleScale, cell.obstacleAnchor),
                      borderColor: cell.obstacle,
                      backgroundColor: `${cell.obstacle}4D`,
                      boxShadow: `inset 0 0 0 1px ${cell.obstacle}AA`,
                    }}
                  >
                    {cell.obstaclePreset === "door" ? (
                      <span className="text-[10px] font-black text-amber-100">
                        🚪
                      </span>
                    ) : cell.obstaclePreset === "column" ? (
                      <span className="text-[10px] font-black text-slate-100">
                        ◉
                      </span>
                    ) : cell.obstaclePreset === "light" ? (
                      <span className="text-[10px] font-black text-yellow-100">
                        ✦
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {cell.furniture ? (
                  <div
                    className="absolute flex items-center justify-center rounded-sm"
                    style={{
                      ...getStampStyle(cell.furnitureScale, cell.furnitureAnchor),
                      backgroundColor: cell.furniture,
                      backgroundImage:
                        cell.furniturePreset === "stage"
                          ? cell.furnitureVariant === "stone"
                            ? "linear-gradient(180deg, rgba(226,232,240,0.6), rgba(71,85,105,0.45))"
                            : cell.furnitureVariant === "velvet"
                              ? "repeating-linear-gradient(90deg, rgba(244,114,182,0.6) 0 3px, rgba(131,24,67,0.5) 3px 6px)"
                              : "repeating-linear-gradient(90deg, rgba(245,158,11,0.45) 0 4px, rgba(120,53,15,0.45) 4px 8px)"
                          : "linear-gradient(120deg, rgba(255,255,255,0.2), rgba(15,23,42,0.22))",
                    }}
                  >
                    {cell.furniturePreset === "table" ? "▭" : null}
                    {cell.furniturePreset === "chair" ? "◍" : null}
                    {cell.furniturePreset === "stage" ? "▤" : null}
                    {cell.furniturePreset === "crate" ? "▣" : null}
                    {cell.furniturePreset === "altar" ? "✢" : null}
                  </div>
                ) : null}
                {cell.fog ? (
                  <div className="absolute inset-0 bg-slate-950/70" />
                ) : null}
                {!isVisible ? (
                  <div className="absolute inset-0 bg-black" />
                ) : null}
              </div>
            );
          })}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)",
              backgroundSize: `${100 / cols}% ${100 / rows}%`,
            }}
          />

          {tokens.map((token) => {
            const left = `${((token.x + 0.5) / cols) * 100}%`;
            const top = `${((token.y + 0.5) / rows) * 100}%`;
            const isActive = activeTokenId === token.id;
            const visibleStatuses = (token.statuses ?? [])
              .slice(0, 2)
              .flatMap((status) => {
                const meta = getStatusMeta(status);
                return meta ? [meta] : [];
              });
            const extraStatusCount = Math.max(
              (token.statuses ?? []).length - visibleStatuses.length,
              0,
            );
            const style: CSSProperties = {
              left,
              top,
              transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              transformOrigin: "center",
              borderColor: token.color,
              backgroundColor: `${token.color}33`,
              boxShadow: isActive
                ? `0 0 0 3px rgba(250, 204, 21, 0.9), 0 0 30px ${token.color}88`
                : `0 0 24px ${token.color}55`,
            };
            const isHiddenByMask = visibleMask
              ? !visibleMask[getCellIndex(token.x, token.y, cols)]
              : false;
            if (isHiddenByMask) return null;
            return (
              <button
                key={token.id}
                onPointerDown={
                  onTokenPointerDown ? onTokenPointerDown(token.id) : undefined
                }
                className="absolute flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-semibold text-white shadow-lg transition"
                style={style}
                title={
                  (token.statuses ?? []).length
                    ? `${token.name}: ${(token.statuses ?? []).map((status) => getStatusMeta(status)?.label ?? status).join(", ")}`
                    : token.name
                }
              >
                {token.short}
                {visibleStatuses.length ? (
                  <span className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 gap-1">
                    {visibleStatuses.map((status) => (
                      <span
                        key={`${token.id}-${status.key}`}
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ${status.colorClass}`}
                      >
                        {status.short}
                      </span>
                    ))}
                    {extraStatusCount ? (
                      <span className="rounded-full border border-white/10 bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-bold leading-none text-slate-200">
                        +{extraStatusCount}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GameRoomPage({ roomId }: { roomId: string }) {
  const inviteLink =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/rooms/${roomId}`;
  const [roomPassword, setRoomPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [displayName, setDisplayName] = useState("Мастер Аркейн");
  const [joinIntent, setJoinIntent] = useState<JoinIntent>("player");
  const [role, setRole] = useState<RoomRole | null>(null);
  const [joinStep, setJoinStep] = useState<JoinStep>("auth");
  const [authError, setAuthError] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [mapName, setMapName] = useState("Руины старой башни");
  const [mapState, setMapState] = useState<MapState>(createInitialMapState);
  const [mainMapSnapshot, setMainMapSnapshot] = useState<{
    mapName: string;
    mapState: MapState;
  }>({
    mapName: "Руины старой башни",
    mapState: createInitialMapState(),
  });
  const [savedMaps, setSavedMaps] = useState<SavedMapPreset[]>([]);
  const [activeSavedMapId, setActiveSavedMapId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<RoomToken[]>(initialTokens);
  const [sheets, setSheets] = useState<CharacterSheet[]>(initialSheets);
  const [selectedTokenId, setSelectedTokenId] = useState("elira");
  const [tool, setTool] = useState<DrawingTool>("move");
  const [selectedColor, setSelectedColor] = useState(layerPalette.terrain[1]);
  const [selectedTerrainPreset, setSelectedTerrainPreset] = useState<
    (typeof terrainBrushes)[number]["id"]
  >("stone");
  const [selectedTexturePreset, setSelectedTexturePreset] = useState<
    (typeof textureBrushes)[number]["id"]
  >("moss");
  const [selectedObstaclePreset, setSelectedObstaclePreset] = useState<
    (typeof obstacleBrushes)[number]["id"]
  >("stone-wall");
  const [selectedFurniturePreset, setSelectedFurniturePreset] = useState<
    (typeof furnitureBrushes)[number]["id"]
  >("table");
  const [selectedStageVariant, setSelectedStageVariant] = useState<
    "wood" | "stone" | "velvet"
  >("wood");
  const [stampScale, setStampScale] = useState<"full" | "half" | "quarter">(
    "full",
  );
  const [stampAnchor, setStampAnchor] = useState<
    "center" | "tl" | "tr" | "bl" | "br"
  >("center");
  const [activeBoard, setActiveBoard] = useState<BoardKind>("public");
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [diceFormula, setDiceFormula] = useState("1d20+5");
  const [lootCrBand, setLootCrBand] = useState<LootCrBand>("0-4");
  const [lootResult, setLootResult] = useState<LootResult>(randomLootDefault);
  const [eventResult, setEventResult] = useState(randomEventPool[0]);
  const [zoom, setZoom] = useState(1);
  const [gridColsInput, setGridColsInput] = useState(String(DEFAULT_COLS));
  const [gridRowsInput, setGridRowsInput] = useState(String(DEFAULT_ROWS));
  const [useFogOfWar, setUseFogOfWar] = useState(true);
  const [useSharedGmMapForPlayers, setUseSharedGmMapForPlayers] =
    useState(true);
  const [mapPresetName, setMapPresetName] = useState("Сцена 1");
  const [quickMapTabName, setQuickMapTabName] = useState("");
  const [quickTabAsToken, setQuickTabAsToken] = useState(true);
  const [widgetUrl, setWidgetUrl] = useState(DEFAULT_WIDGET_URL);
  const [npcNameInput, setNpcNameInput] = useState("Ночной информатор");
  const [npcKindInput, setNpcKindInput] = useState<TokenKind>("npc");
  const [npcColorInput, setNpcColorInput] = useState("rgb(251 191 36)");
  const [npcHpInput, setNpcHpInput] = useState("11");
  const [npcAcInput, setNpcAcInput] = useState("12");
  const [npcSpeedInput, setNpcSpeedInput] = useState("30");
  const [npcPlacementBoard, setNpcPlacementBoard] = useState<BoardKind>("gm");
  const [rumorPromptInput, setRumorPromptInput] = useState(
    "контрабанда в доках и пропавший сборщик налогов",
  );
  const [rumorResults, setRumorResults] = useState<string[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([
    {
      id: "j1",
      type: "system",
      text: "Комната работает как обычная комната с паролем: первый вход становится мастером, остальные — игроками.",
      time: nowTime(),
    },
  ]);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [masterPreset, setMasterPreset] = useState<MasterViewPreset>("combat");
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [isCreaturesDrawerOpen, setIsCreaturesDrawerOpen] = useState(true);
  const [creaturesDrawerWidth, setCreaturesDrawerWidth] = useState(520);
  const [creaturesDrawerTab, setCreaturesDrawerTab] = useState<"tokens" | "party">("tokens");
  const [journalFilter, setJournalFilter] = useState<JournalEntry["type"] | "all">(
    "all",
  );
  const [journalSearch, setJournalSearch] = useState("");
  const [initiative, setInitiative] = useState<InitiativeState>(
    createEmptyInitiativeState,
  );
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>({
    id: "room-campaign",
    name: "Руины старой башни",
    progressionMode: "xp",
    edition: "5e14",
    includeHomebrew: false,
    manualLevelUpUnlocked: false,
  });
  const [levelUpDrafts, setLevelUpDrafts] = useState<
    Record<string, LevelUpDraft | undefined>
  >({});
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [savedCharacters, setSavedCharacters] = useState<
    SavedCharacterPreset[]
  >([]);
  const [customXpInput, setCustomXpInput] = useState("0");
  const [levelRollbackSnapshots, setLevelRollbackSnapshots] = useState<
    Record<string, CharacterSheet[]>
  >({});
  const [gmLayoutConfig, setGmLayoutConfig] = useState<MasterLayoutConfig>({
    version: 2,
    order: ["admin", "tokens", "party", "initiative", "tools"],
    panels: {
      admin: { size: "regular" },
      tokens: { size: "regular" },
      party: { size: "wide" },
      initiative: { size: "wide" },
      tools: { size: "full" },
    },
  });
  const [draggedMasterPanel, setDraggedMasterPanel] =
    useState<MasterPanelId | null>(null);
  const [dragOverMasterPanel, setDragOverMasterPanel] =
    useState<MasterPanelId | null>(null);
  const gmPanelOrder = gmLayoutConfig.order;
  const gmPanelSizes = useMemo(
    () => ({
      admin: gmLayoutConfig.panels.admin.size,
      tokens: gmLayoutConfig.panels.tokens.size,
      party: gmLayoutConfig.panels.party.size,
      initiative: gmLayoutConfig.panels.initiative.size,
      tools: gmLayoutConfig.panels.tools.size,
    }),
    [gmLayoutConfig],
  );

  const cols = mapState.cols;
  const rows = mapState.rows;
  const currentMapId = activeSavedMapId ?? "main";
  const playerTiles = useSharedGmMapForPlayers
    ? mapState.gmTiles
    : mapState.publicTiles;
  const activeTiles =
    activeBoard === "public" ? mapState.publicTiles : mapState.gmTiles;
  const handleZoomOut = useCallback(
    () =>
      setZoom((current) =>
        clamp(Number((current - 0.1).toFixed(2)), 0.2, 1.8),
      ),
    [],
  );
  const handleZoomIn = useCallback(
    () =>
      setZoom((current) =>
        clamp(Number((current + 0.1).toFixed(2)), 0.2, 1.8),
      ),
    [],
  );
  const handleZoomFit = useCallback(() => {
    const fitByWidth = 1200 / (cols * 44);
    const fitByHeight = 700 / (rows * 44);
    setZoom(clamp(Math.min(fitByWidth, fitByHeight), 0.2, 1.8));
  }, [cols, rows]);

  const selectedToken = useMemo(
    () => tokens.find((token) => token.id === selectedTokenId) ?? tokens[0],
    [selectedTokenId, tokens],
  );
  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.tokenId === selectedToken?.id),
    [selectedToken?.id, sheets],
  );
  const tokensOnCurrentMap = useMemo(
    () =>
      tokens.filter((token) => {
        const tokenMapId = token.mapId ?? "main";
        return tokenMapId === currentMapId;
      }),
    [currentMapId, tokens],
  );
  const playerTokens = useMemo(
    () => getPlayerTokens(tokensOnCurrentMap),
    [tokensOnCurrentMap],
  );
  const groupSheets = useMemo(
    () =>
      sheets.filter((sheet) =>
        playerTokens.some((token) => token.sheetId === sheet.id),
      ),
    [playerTokens, sheets],
  );
  const canEditSheet = useCallback(
    (sheet: CharacterSheet) => {
      if (role === "gm") return true;
      if (role !== "player") return false;
      const ownerToken = tokens.find((token) => token.sheetId === sheet.id);
      return ownerToken?.owner === displayName;
    },
    [displayName, role, tokens],
  );
  const selectedSheetToken = useMemo(
    () =>
      selectedSheet
        ? (tokens.find(
            (token) =>
              token.sheetId === selectedSheet.id ||
              token.id === selectedSheet.tokenId,
          ) ?? null)
        : null,
    [selectedSheet, tokens],
  );
  const selectedSheetResources = useMemo(
    () =>
      selectedSheet
        ? normalizeResources(selectedSheet.resources)
        : createDefaultResources(),
    [selectedSheet],
  );
  const selectedSheetInitiativeModifier = useMemo(
    () =>
      selectedSheetToken
        ? getInitiativeModifier(selectedSheetToken, sheets)
        : 0,
    [selectedSheetToken, sheets],
  );
  const selectedProgression = useMemo(
    () =>
      selectedSheet
        ? deriveCharacterProgression(
            selectedSheet,
            campaignConfig,
            levelUpDrafts[selectedSheet.id],
          )
        : null,
    [campaignConfig, levelUpDrafts, selectedSheet],
  );
  const selectedLevelUpDraft = selectedSheet
    ? (levelUpDrafts[selectedSheet.id] ?? null)
    : null;
  const selectedLevelUpPreview = useMemo(
    () =>
      selectedSheet && selectedLevelUpDraft
        ? buildLevelUpPreview(
            selectedSheet,
            campaignConfig,
            selectedLevelUpDraft,
          )
        : null,
    [campaignConfig, selectedLevelUpDraft, selectedSheet],
  );
  const selectedProgressionOptions = useMemo(
    () =>
      selectedSheet
        ? getProgressionOptions(selectedSheet, campaignConfig)
        : null,
    [campaignConfig, selectedSheet],
  );

  const activePalette = useMemo(() => {
    const toolConfig = toolMeta.find((item) => item.value === tool);
    return toolConfig?.layer
      ? layerPalette[toolConfig.layer]
      : layerPalette.terrain;
  }, [tool]);

  const playerVisibilityMask = useMemo(
    () =>
      Array.from({ length: cols * rows }, (_, index) =>
        !(
          useFogOfWar &&
          (playerTiles[index] ?? createCell()).fog
        ) &&
        isCellVisibleToPlayers(
          index % cols,
          Math.floor(index / cols),
          tokensOnCurrentMap,
        ),
      ),
    [cols, playerTiles, rows, tokensOnCurrentMap, useFogOfWar],
  );

  const visibleTokensForPlayers = useMemo(
    () =>
      tokensOnCurrentMap.filter(
        (token) =>
          !token.gmOnly &&
          !token.hiddenFromPlayers &&
          playerVisibilityMask[getCellIndex(token.x, token.y, cols)],
      ),
    [cols, playerVisibilityMask, tokensOnCurrentMap],
  );
  const visibleTokenIdsForPlayers = useMemo(
    () => new Set(visibleTokensForPlayers.map((token) => token.id)),
    [visibleTokensForPlayers],
  );
  const activeInitiativeParticipant =
    initiative.participants[initiative.currentTurnIndex] ?? null;
  const visibleInitiativeForPlayers = useMemo(
    () =>
      initiative.participants.filter(
        (participant) =>
          visibleTokenIdsForPlayers.has(participant.tokenId) &&
          !participant.hiddenFromPlayers,
      ),
    [initiative.participants, visibleTokenIdsForPlayers],
  );
  const initiativeParticipantsForView =
    role === "gm" ? initiative.participants : visibleInitiativeForPlayers;
  const initiativePortraits = useMemo(
    () =>
      new Map(sheets.map((sheet) => [sheet.tokenId, sheet.avatarUrl ?? null])),
    [sheets],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(getRoomStorageKey(roomId));
    if (!stored) {
      setIsLoadedFromStorage(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<SavedRoomState>;
      if (parsed.mapName) {
        setMapName(parsed.mapName);
        setMapPresetName(parsed.mapName);
      }
      if (typeof parsed.useFogOfWar === "boolean")
        setUseFogOfWar(parsed.useFogOfWar);
      if (typeof parsed.useSharedGmMapForPlayers === "boolean")
        setUseSharedGmMapForPlayers(parsed.useSharedGmMapForPlayers);
      if (parsed.mainMapSnapshot?.mapName && parsed.mainMapSnapshot?.mapState) {
        setMainMapSnapshot(parsed.mainMapSnapshot);
      }
      if (
        parsed.mapState?.cols &&
        parsed.mapState?.rows &&
        parsed.mapState.publicTiles &&
        parsed.mapState.gmTiles
      ) {
        setMapState(parsed.mapState as MapState);
        setGridColsInput(String(parsed.mapState.cols));
        setGridRowsInput(String(parsed.mapState.rows));
      }
      if (parsed.savedMaps) setSavedMaps(parsed.savedMaps);
      if (parsed.activeSavedMapId) setActiveSavedMapId(parsed.activeSavedMapId);
      if (parsed.widgetUrl) setWidgetUrl(parsed.widgetUrl);
      if (parsed.tokens) setTokens(parsed.tokens.map(normalizeToken));
      if (parsed.sheets)
        setSheets(
          parsed.sheets.map((sheet) => ({
            ...sheet,
            resources: normalizeResources(sheet.resources),
          })),
        );
      if (parsed.journal) setJournal(parsed.journal);
      if (parsed.initiative)
        setInitiative(
          syncInitiativeWithTokens(
            parsed.initiative as InitiativeState,
            (parsed.tokens ?? initialTokens).map(normalizeToken),
            parsed.sheets ?? initialSheets,
          ),
        );
      if (typeof parsed.creaturesDrawerWidth === "number") {
        setCreaturesDrawerWidth(parsed.creaturesDrawerWidth);
      }
      if (parsed.gmLayout) {
        const normalizedLayout = normalizeSavedLayoutConfig(parsed.gmLayout);
        setGmLayoutConfig(normalizedLayout);
        if ("panelOrder" in parsed.gmLayout || "panelWidths" in parsed.gmLayout) {
          setToasts((current) => [
            ...current,
            {
              id: `${Date.now()}-layout-migrated`,
              tone: "info",
              text: "Раскладка панелей мягко мигрирована на формат v2.",
            },
          ]);
        }
      }
    } catch {
      // ignore corrupted local state
    }

    setIsLoadedFromStorage(true);
  }, [roomId]);

  useEffect(() => {
    if (!isLoadedFromStorage) return;
    const payload = buildSavedRoomState({
      mapName,
      mapState,
      savedMaps,
      activeSavedMapId,
      widgetUrl,
      useFogOfWar,
      useSharedGmMapForPlayers,
      mainMapSnapshot,
      tokens: tokens.map(normalizeToken),
      sheets,
      journal,
      initiative,
      gmLayout: gmLayoutConfig,
      creaturesDrawerWidth,
    });
    try {
      window.localStorage.setItem(getRoomStorageKey(roomId), JSON.stringify(payload));
      setSaveState("saved");
      setLastSavedAt(nowTime());
    } catch {
      setSaveState("error");
    }
  }, [
    activeSavedMapId,
    initiative,
    isLoadedFromStorage,
    journal,
    gmLayoutConfig,
    creaturesDrawerWidth,
    mapName,
    mapState,
    roomId,
    savedMaps,
    sheets,
    tokens,
    useFogOfWar,
    useSharedGmMapForPlayers,
    mainMapSnapshot,
    widgetUrl,
  ]);

  useEffect(() => {
    if (!activeSavedMapId) return;
    setSavedMaps((current) =>
      current.map((preset) =>
        preset.id === activeSavedMapId
          ? { ...preset, mapName, mapState }
          : preset,
      ),
    );
  }, [activeSavedMapId, mapName, mapState]);

  useEffect(() => {
    if (activeSavedMapId) return;
    setMainMapSnapshot((current) => {
      if (current.mapName === mapName && current.mapState === mapState) {
        return current;
      }
      return { mapName, mapState };
    });
  }, [activeSavedMapId, mapName, mapState]);

  useEffect(() => {
    const stored = window.localStorage.getItem(getCharacterLibraryStorageKey(roomId));
    if (!stored) return;
    try {
      setSavedCharacters(JSON.parse(stored) as SavedCharacterPreset[]);
    } catch {
      // ignore corrupted character library
    }
  }, [roomId]);

  useEffect(() => {
    window.localStorage.setItem(
      getCharacterLibraryStorageKey(roomId),
      JSON.stringify(savedCharacters),
    );
  }, [roomId, savedCharacters]);

  const addJournalEntry = useCallback(
    (type: JournalEntry["type"], text: string) => {
      setJournal((current) =>
        [
          { id: `${Date.now()}-${Math.random()}`, type, text, time: nowTime() },
          ...current,
        ].slice(0, 20),
      );
    },
    [],
  );

  const pushToast = useCallback(
    (text: string, tone: ToastMessage["tone"] = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current, { id, tone, text }].slice(-4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 2200);
    },
    [],
  );

  const onboardingSteps = useMemo(() => {
    const isAuthDone = joinStep === "ready";
    const hasPlayerSheet = sheets.some((sheet) => sheet.playerName === displayName || sheet.name === displayName);
    const hasOwnedToken = tokens.some((token) => token.owner === displayName && token.kind === "player");
    const hasDiceRoll = journal.some((entry) => entry.type === "dice" && entry.text.includes(displayName));
    const hasMapLoaded = mapName.trim().length > 0;
    const hasAnyToken = tokens.length > 0;
    const hasInitiativeRun = initiative.participants.length > 0 || initiative.active;
    if (role === "gm") {
      return [
        { id: "auth", label: "Войти в комнату как мастер", done: isAuthDone },
        { id: "map", label: "Загрузить или выбрать карту", done: hasMapLoaded },
        { id: "tokens", label: "Расставить токены на сцене", done: hasAnyToken },
        { id: "initiative", label: "Запустить инициативу", done: hasInitiativeRun },
      ];
    }
    return [
      { id: "auth", label: "Войти в комнату", done: isAuthDone },
      { id: "sheet", label: "Создать или импортировать лист", done: hasPlayerSheet },
      { id: "token", label: "Выбрать и проверить свой токен", done: hasOwnedToken },
      { id: "dice", label: "Сделать первый бросок", done: hasDiceRoll },
    ];
  }, [displayName, initiative.active, initiative.participants.length, joinStep, journal, mapName, role, sheets, tokens]);

  const filteredJournal = useMemo(() => {
    return journal.filter((entry) => {
      const byType = journalFilter === "all" ? true : entry.type === journalFilter;
      const byText = journalSearch.trim()
        ? entry.text.toLowerCase().includes(journalSearch.trim().toLowerCase())
        : true;
      return byType && byText;
    });
  }, [journal, journalFilter, journalSearch]);

  const panelVisibility = useMemo(
    () => ({
      admin: masterPreset === "prep" || masterPreset === "explore",
      tokens: true,
      party: true,
      initiative: masterPreset === "combat",
      tools: masterPreset !== "combat",
    }),
    [masterPreset],
  );
  const activeMasterGroups = useMemo(() => {
    if (masterPreset === "combat") return ["combat", "creatures", "narrative"] as const;
    if (masterPreset === "explore") return ["scene", "narrative", "creatures"] as const;
    return ["scene", "creatures", "combat"] as const;
  }, [masterPreset]);
  const initiativeOrder = useMemo(
    () =>
      initiative.participants.map((participant, index) =>
        index === initiative.currentTurnIndex
          ? `▶ ${participant.name}`
          : participant.name,
      ),
    [initiative.currentTurnIndex, initiative.participants],
  );
  const masterPanelModels = useMemo(
    () => {
      const query = globalSearch.trim().toLowerCase();
      return gmPanelOrder.map((panelId) => ({
        id: panelId,
        group: masterPanelGroups[panelId],
        title: masterPanelMeta[panelId].title,
        description: masterPanelMeta[panelId].description,
        visibility: panelVisibility[panelId],
        priority: gmPanelOrder.indexOf(panelId),
        size: gmPanelSizes[panelId],
        matchesSearch:
          !query ||
          masterPanelMeta[panelId].title.toLowerCase().includes(query) ||
          masterPanelMeta[panelId].description.toLowerCase().includes(query),
      }));
    },
    [globalSearch, gmPanelOrder, gmPanelSizes, panelVisibility],
  );
  const masterPanelSearchMap = useMemo(
    () =>
      masterPanelModels.reduce(
        (accumulator, panel) => {
          accumulator[panel.id] = panel.matchesSearch;
          return accumulator;
        },
        {} as Record<MasterPanelId, boolean>,
      ),
    [masterPanelModels],
  );

  const buildInitiativeParticipants = useCallback(
    (mode: "players" | "visible" | "all") => {
      const scope = tokens.filter((token) => {
        if (token.kind === "object") return false;
        if (mode === "players") return token.kind === "player";
        if (mode === "visible")
          return (
            visibleTokenIdsForPlayers.has(token.id) || token.kind === "player"
          );
        return true;
      });

      return scope
        .map((token) => {
          const modifier = getInitiativeModifier(token, sheets);
          const roll = rollDie(20);
          return {
            tokenId: token.id,
            name: token.name,
            kind: token.kind,
            initiative: roll + modifier,
            initiativeModifier: modifier,
            color: token.color,
            hiddenFromPlayers: token.gmOnly,
          };
        })
        .sort((left, right) => {
          if (right.initiative !== left.initiative)
            return right.initiative - left.initiative;
          if (right.initiativeModifier !== left.initiativeModifier)
            return right.initiativeModifier - left.initiativeModifier;
          return left.name.localeCompare(right.name, "ru");
        });
    },
    [sheets, tokens, visibleTokenIdsForPlayers],
  );

  const updateInitiativeParticipant = useCallback(
    (
      tokenId: string,
      updater: (participant: InitiativeParticipant) => InitiativeParticipant,
    ) => {
      setInitiative((current) => ({
        ...current,
        participants: current.participants.map((participant) =>
          participant.tokenId === tokenId ? updater(participant) : participant,
        ),
      }));
    },
    [],
  );

  const handleStartInitiative = useCallback(
    (mode: "players" | "visible" | "all") => {
      if (role !== "gm") return;
      const participants = buildInitiativeParticipants(mode);
      if (!participants.length) {
        addJournalEntry(
          "initiative",
          "Не удалось запустить инициативу: нет подходящих участников.",
        );
        pushToast("Инициатива не запущена: нет участников.", "warning");
        return;
      }

      setInitiative({
        active: true,
        round: 1,
        currentTurnIndex: 0,
        participants,
      });

      addJournalEntry(
        "initiative",
        `Инициатива запущена (${mode === "all" ? "все токены" : mode === "visible" ? "видимые участники" : "только игроки"}): ${participants.map((participant) => `${participant.name} ${participant.initiative}`).join(", ")}.`,
      );
      pushToast("Инициатива запущена.", "success");
    },
    [addJournalEntry, buildInitiativeParticipants, pushToast, role],
  );

  const handleAdvanceTurn = useCallback(() => {
    if (role !== "gm") return;
    setInitiative((current) => {
      if (!current.active || current.participants.length === 0) return current;
      const nextIndex =
        (current.currentTurnIndex + 1) % current.participants.length;
      const nextRound = nextIndex === 0 ? current.round + 1 : current.round;
      const nextParticipant = current.participants[nextIndex];
      addJournalEntry(
        "initiative",
        `Ход переходит к ${nextParticipant.name}. Раунд ${nextRound}.`,
      );
      pushToast(`Следующий ход: ${nextParticipant.name}.`, "info");
      return {
        ...current,
        currentTurnIndex: nextIndex,
        round: nextRound,
      };
    });
  }, [addJournalEntry, pushToast, role]);

  const handleStopInitiative = useCallback(() => {
    if (role !== "gm") return;
    setInitiative(createEmptyInitiativeState());
    addJournalEntry("initiative", "Трекер инициативы очищен.");
    pushToast("Инициатива сброшена.", "info");
  }, [addJournalEntry, pushToast, role]);

  const handleSelectTurn = useCallback(
    (tokenId: string) => {
      if (role !== "gm") return;
      setInitiative((current) => {
        const nextIndex = current.participants.findIndex(
          (participant) => participant.tokenId === tokenId,
        );
        if (nextIndex < 0) return current;
        return {
          ...current,
          active: current.participants.length > 0,
          currentTurnIndex: nextIndex,
        };
      });
    },
    [role],
  );

  const handleMoveInitiativeParticipant = useCallback(
    (tokenId: string, direction: "up" | "down") => {
      if (role !== "gm") return;
      setInitiative((current) => {
        const index = current.participants.findIndex(
          (participant) => participant.tokenId === tokenId,
        );
        if (index < 0) return current;
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= current.participants.length)
          return current;

        const participants = [...current.participants];
        [participants[index], participants[swapIndex]] = [
          participants[swapIndex],
          participants[index],
        ];

        let currentTurnIndex = current.currentTurnIndex;
        if (currentTurnIndex === index) currentTurnIndex = swapIndex;
        else if (currentTurnIndex === swapIndex) currentTurnIndex = index;

        return {
          ...current,
          participants,
          currentTurnIndex,
        };
      });

      const participant = initiative.participants.find(
        (entry) => entry.tokenId === tokenId,
      );
      if (participant)
        addJournalEntry(
          "initiative",
          `${participant.name}: порядок ходов изменён вручную (${direction === "up" ? "выше" : "ниже"}).`,
        );
    },
    [addJournalEntry, initiative.participants, role],
  );

  const setTilesForBoard = useCallback(
    (board: BoardKind, nextTiles: CellData[]) => {
      setMapState((current) => ({
        ...current,
        publicTiles: board === "public" ? nextTiles : current.publicTiles,
        gmTiles: board === "gm" ? nextTiles : current.gmTiles,
      }));
    },
    [],
  );

  const applyCellChange = useCallback(
    (
      board: BoardKind,
      index: number,
      updater: (cell: CellData) => CellData,
    ) => {
      const sourceTiles =
        board === "public" ? mapState.publicTiles : mapState.gmTiles;
      setTilesForBoard(
        board,
        sourceTiles.map((cell, cellIndex) =>
          cellIndex === index ? updater(cell) : cell,
        ),
      );
    },
    [mapState.gmTiles, mapState.publicTiles, setTilesForBoard],
  );

  const paintCell = useCallback(
    (x: number, y: number) => {
      const index = getCellIndex(x, y, cols);

      if (tool === "terrain") {
        applyCellChange(activeBoard, index, (cell) => ({
          ...cell,
          terrain: findBrushColor(
            terrainBrushes,
            selectedTerrainPreset,
            selectedColor,
          ),
          terrainPreset: selectedTerrainPreset,
        }));
        return;
      }

      if (tool === "obstacle") {
        applyCellChange(activeBoard, index, (cell) => ({
          ...cell,
          obstacle: findBrushColor(
            obstacleBrushes,
            selectedObstaclePreset,
            selectedColor,
          ),
          obstacleScale: stampScale,
          obstacleAnchor: stampAnchor,
          obstaclePreset: selectedObstaclePreset,
        }));
        return;
      }

      if (tool === "texture") {
        applyCellChange(activeBoard, index, (cell) => ({
          ...cell,
          texture: findBrushColor(
            textureBrushes,
            selectedTexturePreset,
            selectedColor,
          ),
          texturePreset: selectedTexturePreset,
        }));
        return;
      }

      if (tool === "furniture") {
        applyCellChange(activeBoard, index, (cell) => ({
          ...cell,
          furniture: findBrushColor(
            furnitureBrushes,
            selectedFurniturePreset,
            selectedColor,
          ),
          furnitureScale: stampScale,
          furnitureAnchor: stampAnchor,
          furniturePreset: selectedFurniturePreset,
          furnitureVariant:
            selectedFurniturePreset === "stage" ? selectedStageVariant : "wood",
        }));
        return;
      }

      if (tool === "fog") {
        applyCellChange(activeBoard, index, (cell) => ({
          ...cell,
          fog: !cell.fog,
        }));
        return;
      }

      if (tool === "erase") {
        applyCellChange(activeBoard, index, () => createCell());
      }
    },
    [
      activeBoard,
      applyCellChange,
      cols,
      selectedColor,
      selectedFurniturePreset,
      selectedObstaclePreset,
      selectedStageVariant,
      selectedTerrainPreset,
      selectedTexturePreset,
      stampAnchor,
      stampScale,
      tool,
    ],
  );

  const canMoveToken = useCallback(
    (token: RoomToken) => {
      if (role === "gm") return true;
      if (role !== "player") return false;
      return token.roleOwner === "player" && token.owner === displayName;
    },
    [displayName, role],
  );

  const applyPointerToBoard = useCallback(
    (clientX: number, clientY: number, board: BoardKind) => {
      const boardElement = document.getElementById(`battle-grid-${board}`);
      if (!boardElement) return;

      const rect = boardElement.getBoundingClientRect();
      const x = clamp(
        Math.floor(((clientX - rect.left) / rect.width) * cols),
        0,
        cols - 1,
      );
      const y = clamp(
        Math.floor(((clientY - rect.top) / rect.height) * rows),
        0,
        rows - 1,
      );

      if (draggingTokenId) {
        setTokens((current) =>
          current.map((token) =>
            token.id === draggingTokenId
              ? { ...token, x, y, mapId: currentMapId }
              : token,
          ),
        );
        return;
      }

      if (tool !== "move") {
        paintCell(x, y);
        return;
      }

      if (selectedTokenId) {
        setTokens((current) =>
          current.map((token) => {
            if (token.id !== selectedTokenId || !canMoveToken(token))
              return token;
            return { ...token, x, y, mapId: currentMapId };
          }),
        );
      }
    },
    [
      canMoveToken,
      cols,
      draggingTokenId,
      paintCell,
      rows,
      selectedTokenId,
      tool,
      currentMapId,
    ],
  );

  useEffect(() => {
    if (!isPointerDown) return undefined;

    const handleMove = (event: PointerEvent) => {
      applyPointerToBoard(event.clientX, event.clientY, activeBoard);
    };

    const handleUp = () => {
      if (draggingTokenId) {
        const moved = tokens.find((token) => token.id === draggingTokenId);
        if (moved) {
          addJournalEntry(
            "move",
            `${moved.name} перемещён на ${cellCoordinate(moved.x, moved.y)}.`,
          );
        }
      }

      setIsPointerDown(false);
      setDraggingTokenId(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [
    activeBoard,
    addJournalEntry,
    applyPointerToBoard,
    draggingTokenId,
    isPointerDown,
    tokens,
  ]);

  const handleBoardPointerDown =
    (board: BoardKind) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (joinStep !== "ready") return;
      setActiveBoard(board);
      setIsPointerDown(true);
      applyPointerToBoard(event.clientX, event.clientY, board);
    };

  const handleTokenPointerDown =
    (tokenId: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      const token = tokens.find((item) => item.id === tokenId);
      if (!token) return;

      setSelectedTokenId(tokenId);

      if (token.linkedMapId) {
        if (token.linkedMapId === "main") {
          setActiveSavedMapId(null);
          setMapName(mainMapSnapshot.mapName);
          setMapPresetName(mainMapSnapshot.mapName);
          setMapState(mainMapSnapshot.mapState);
          setGridColsInput(String(mainMapSnapshot.mapState.cols));
          setGridRowsInput(String(mainMapSnapshot.mapState.rows));
          addJournalEntry(
            "map",
            `${token.name}: быстрый возврат на основную карту.`,
          );
          return;
        }
        const linkedPreset = savedMaps.find(
          (preset) => preset.id === token.linkedMapId,
        );
        if (linkedPreset) {
          setActiveSavedMapId(linkedPreset.id);
          setMapPresetName(linkedPreset.name);
          setMapName(linkedPreset.mapName);
          setMapState(linkedPreset.mapState);
          setGridColsInput(String(linkedPreset.mapState.cols));
          setGridRowsInput(String(linkedPreset.mapState.rows));
          addJournalEntry(
            "map",
            `${token.name}: переход на карту «${linkedPreset.name}».`,
          );
          return;
        }
      }

      if (!canMoveToken(token)) return;

      setTool("move");
      setDraggingTokenId(tokenId);
      setIsPointerDown(true);
    };

  const handleUploadMap = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextName = file.name.replace(/\.[^.]+$/, "");
    const nextPresetId = `map-${Date.now()}`;
    const nextMapState: MapState = {
      cols,
      rows,
      publicTiles: createEmptyMap(cols, rows),
      gmTiles: createEmptyMap(cols, rows),
    };
    const nextPreset: SavedMapPreset = {
      id: nextPresetId,
      name: nextName,
      mapName: nextName,
      mapState: nextMapState,
    };
    const nextSavedMaps = [...savedMaps, nextPreset];
    const nextJournal = [
      {
        id: `${Date.now()}-${Math.random()}`,
        type: "map" as const,
        text: `Загружена карта «${file.name}» и создана новая вкладка.`,
        time: nowTime(),
      },
      ...journal,
    ].slice(0, 20);

    setMapName(nextName);
    setMapPresetName(nextName);
    setMapState(nextMapState);
    setSavedMaps(nextSavedMaps);
    setActiveSavedMapId(nextPresetId);
    setJournal(nextJournal);

    if (isLoadedFromStorage) {
      const payload = buildSavedRoomState({
        mapName: nextName,
        mapState: nextMapState,
        savedMaps: nextSavedMaps,
        activeSavedMapId: nextPresetId,
        tokens: tokens.map(normalizeToken),
        sheets,
        journal: nextJournal,
        widgetUrl,
        useFogOfWar,
        useSharedGmMapForPlayers,
        mainMapSnapshot,
        initiative,
        gmLayout: gmLayoutConfig,
        creaturesDrawerWidth,
      });
      window.localStorage.setItem(
        getRoomStorageKey(roomId),
        JSON.stringify(payload),
      );
    }

    event.target.value = "";
  };

  const handleSaveMap = () => {
    const presetId = `map-${Date.now()}`;
    const nextPreset: SavedMapPreset = {
      id: presetId,
      name: mapPresetName.trim() || mapName || "Новая сцена",
      mapName,
      mapState,
    };

    const nextSavedMaps = [...savedMaps, nextPreset];

    setSavedMaps(nextSavedMaps);
    setActiveSavedMapId(presetId);

    const payload = buildSavedRoomState({
      mapName,
      mapState,
      savedMaps: nextSavedMaps,
      activeSavedMapId: presetId,
      tokens: tokens.map(normalizeToken),
      sheets,
      journal,
      widgetUrl,
      useFogOfWar,
      useSharedGmMapForPlayers,
      mainMapSnapshot,
      initiative,
      gmLayout: gmLayoutConfig,
      creaturesDrawerWidth,
    });
    window.localStorage.setItem(getRoomStorageKey(roomId), JSON.stringify(payload));
    addJournalEntry(
      "save",
      `Карта «${nextPreset.name}» сохранена локально для комнаты ${roomId} как новая вкладка.`,
    );
    pushToast(`Сцена «${nextPreset.name}» сохранена.`, "success");
  };

  const handleExportMapJson = () => {
    const nextSavedMaps = activeSavedMapId
      ? savedMaps.map((preset) =>
          preset.id === activeSavedMapId
            ? {
                ...preset,
                name: mapPresetName.trim() || preset.name,
                mapName,
                mapState,
              }
            : preset,
        )
      : savedMaps;

    const payload = buildSavedRoomState({
      mapName,
      mapState,
      savedMaps: nextSavedMaps,
      activeSavedMapId,
      tokens: tokens.map(normalizeToken),
      sheets,
      journal,
      widgetUrl,
      useFogOfWar,
      useSharedGmMapForPlayers,
      mainMapSnapshot,
      initiative,
      gmLayout: gmLayoutConfig,
      creaturesDrawerWidth,
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(mapPresetName || mapName || roomId).replace(/[^a-zA-Zа-яА-Я0-9-_]+/g, "_")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    addJournalEntry(
      "save",
      `Экспортирован JSON сцены «${mapPresetName || mapName}».`,
    );
    pushToast("JSON сцены экспортирован.", "success");
  };

  const handleImportMapJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as Partial<SavedRoomState>;
      if (
        !parsed.mapName ||
        !parsed.mapState?.publicTiles ||
        !parsed.mapState?.gmTiles
      ) {
        addJournalEntry(
          "system",
          `Файл ${file.name} не содержит валидную карту комнаты.`,
        );
        pushToast("Импорт не выполнен: неверный формат карты.", "warning");
        return;
      }

      setMapName(parsed.mapName);
      setMapPresetName(parsed.mapName);
      setMapState(parsed.mapState);
      setGridColsInput(String(parsed.mapState.cols));
      setGridRowsInput(String(parsed.mapState.rows));
      setSavedMaps(parsed.savedMaps ?? []);
      setActiveSavedMapId(parsed.activeSavedMapId ?? null);
      if (parsed.mainMapSnapshot?.mapName && parsed.mainMapSnapshot?.mapState) {
        setMainMapSnapshot(parsed.mainMapSnapshot);
      }
      setWidgetUrl(parsed.widgetUrl ?? DEFAULT_WIDGET_URL);
      if (parsed.tokens) setTokens(parsed.tokens.map(normalizeToken));
      if (parsed.sheets)
        setSheets(
          parsed.sheets.map((sheet) => ({
            ...sheet,
            resources: normalizeResources(sheet.resources),
          })),
        );
      if (parsed.journal) setJournal(parsed.journal);
      setInitiative(
        syncInitiativeWithTokens(
          (parsed.initiative as InitiativeState | undefined) ??
            createEmptyInitiativeState(),
          (parsed.tokens ?? tokens).map(normalizeToken),
          parsed.sheets ?? sheets,
        ),
      );
      addJournalEntry("map", `JSON-карта «${file.name}» загружена в комнату.`);
      pushToast(`Карта «${file.name}» импортирована.`, "success");
    } catch {
      addJournalEntry(
        "system",
        `Файл ${file.name} не является валидным JSON карты.`,
      );
      pushToast("Ошибка импорта JSON-карты.", "warning");
    } finally {
      event.target.value = "";
    }
  };

  const handleLoadSavedMap = useCallback((preset: SavedMapPreset) => {
    setActiveSavedMapId(preset.id);
    setMapPresetName(preset.name);
    setMapName(preset.mapName);
    setMapState(preset.mapState);
    setGridColsInput(String(preset.mapState.cols));
    setGridRowsInput(String(preset.mapState.rows));
    addJournalEntry("map", `Загружена сохранённая сцена «${preset.name}».`);
  }, [addJournalEntry]);

  const handleReturnToMainMap = useCallback(() => {
    setActiveSavedMapId(null);
    setMapPresetName(mainMapSnapshot.mapName);
    setMapName(mainMapSnapshot.mapName);
    setMapState(mainMapSnapshot.mapState);
    setGridColsInput(String(mainMapSnapshot.mapState.cols));
    setGridRowsInput(String(mainMapSnapshot.mapState.rows));
    addJournalEntry("map", "Возврат на основную карту.");
  }, [addJournalEntry, mainMapSnapshot]);

  const handleSetCurrentAsMainMap = useCallback(() => {
    setMainMapSnapshot({ mapName, mapState });
    addJournalEntry("map", `Текущая сцена «${mapName}» назначена основной.`);
  }, [addJournalEntry, mapName, mapState]);

  const handleFocusPlayerToken = useCallback(
    (tokenId: string) => {
      const token = tokens.find((item) => item.id === tokenId);
      if (!token) return;
      const tokenMapId = token.mapId ?? "main";
      if (tokenMapId === "main") {
        handleReturnToMainMap();
      } else {
        const preset = savedMaps.find((item) => item.id === tokenMapId);
        if (preset) handleLoadSavedMap(preset);
      }
      setSelectedTokenId(tokenId);
    },
    [handleLoadSavedMap, handleReturnToMainMap, savedMaps, tokens],
  );

  const handleQuickCreateMapTab = useCallback(() => {
    if (role !== "gm") return;
    const name = quickMapTabName.trim() || `Сцена ${savedMaps.length + 1}`;
    const presetId = `map-${Date.now()}`;
    const nextPreset: SavedMapPreset = {
      id: presetId,
      name,
      mapName: name,
      mapState: {
        cols,
        rows,
        publicTiles: createEmptyMap(cols, rows),
        gmTiles: createEmptyMap(cols, rows),
      },
    };
    setSavedMaps((current) => [...current, nextPreset]);
    setActiveSavedMapId(presetId);
    setMapName(name);
    setMapPresetName(name);
    setMapState(nextPreset.mapState);
    setGridColsInput(String(cols));
    setGridRowsInput(String(rows));
    setQuickMapTabName("");

    if (quickTabAsToken) {
      const selected = tokens.find((token) => token.id === selectedTokenId);
      const fallbackIndex = tokens.filter((token) => token.kind === "object").length;
      const spawnX = selected ? selected.x : clamp(2 + (fallbackIndex % 4), 0, cols - 1);
      const spawnY = selected ? selected.y : clamp(2 + Math.floor(fallbackIndex / 4), 0, rows - 1);
      const portalToken: RoomToken = {
        id: `portal-${presetId}`,
        name: `Переход: ${name}`,
        short: "↪",
        kind: "object",
        color: "rgb(34 211 238)",
        x: spawnX,
        y: spawnY,
        hp: 1,
        maxHp: 1,
        ac: 10,
        speed: 0,
        owner: displayName,
        roleOwner: "gm",
        linkedMapId: presetId,
        mapId: currentMapId,
        statuses: [],
      };
      setTokens((current) => [...current, portalToken]);
      setSelectedTokenId(portalToken.id);
    }

    addJournalEntry(
      "map",
      `Создана вкладка «${name}»${quickTabAsToken ? " и токен-переход" : ""}.`,
    );
  }, [
    addJournalEntry,
    cols,
    displayName,
    quickMapTabName,
    quickTabAsToken,
    role,
    rows,
    savedMaps.length,
    selectedTokenId,
    tokens,
    currentMapId,
  ]);

  const handleLoadSilkThroneScenario = useCallback(() => {
    if (role !== "gm") return;
    const mainLocation = silkThroneLocations[0];
    const scenarioMaps = silkThroneLocations.slice(1).map((location) => ({
      id: location.id,
      name: location.name,
      mapName: location.name,
      mapState: buildSilkLocationMapState(location),
    }));

    const playerTokensOnly = tokens.filter((token) => token.kind === "player");
    const playerTokensOnMain = playerTokensOnly.map((token, index) => ({
      ...token,
      x: 2 + (index % 4),
      y: 7 + Math.floor(index / 4),
      mapId: mainLocation.id,
    }));
    const mainNpcs = buildSilkNpcTokens(mainLocation);
    const transitionTokens: RoomToken[] = scenarioMaps.map((preset, index) => ({
      id: `silk-portal-${preset.id}`,
      name: `Переход: ${preset.name}`,
      short: "↪",
      kind: "object",
      color: "rgb(196 181 253)",
      x: 1 + (index % 8) * 2,
      y: index < 8 ? 1 : 8,
      hp: 1,
      maxHp: 1,
      ac: 10,
      speed: 0,
      owner: "GM",
      roleOwner: "gm",
      linkedMapId: preset.id,
      mapId: mainLocation.id,
      statuses: [],
    }));
    const locationNpcTokens = silkThroneLocations
      .slice(1)
      .flatMap((location) => buildSilkNpcTokens(location));

    const nextMainMap = buildSilkLocationMapState(mainLocation);
    setMainMapSnapshot({ mapName: mainLocation.name, mapState: nextMainMap });
    setMapName(mainLocation.name);
    setMapPresetName(mainLocation.name);
    setMapState(nextMainMap);
    setGridColsInput(String(nextMainMap.cols));
    setGridRowsInput(String(nextMainMap.rows));
    setSavedMaps(scenarioMaps);
    setActiveSavedMapId(null);
    setTokens([
      ...playerTokensOnMain,
      ...mainNpcs,
      ...transitionTokens,
      ...locationNpcTokens,
    ]);
    setSelectedTokenId(playerTokensOnMain[0]?.id ?? mainNpcs[0]?.id ?? "elira");
    addJournalEntry(
      "map",
      "Развернут сценарий «Шёлковый престол»: главный зал стал основной картой, а переходы ведут в отдельные локации.",
    );
  }, [addJournalEntry, role, tokens]);

  const handleDeleteSavedMap = (presetId: string) => {
    const presetIndex = savedMaps.findIndex((preset) => preset.id === presetId);
    if (presetIndex <= 0) return;
    const preset = savedMaps[presetIndex];
    const shouldDelete = window.confirm(
      `Удалить вкладку «${preset?.name ?? "сцена"}»? Это действие нельзя отменить.`,
    );
    if (!shouldDelete) return;

    const nextSavedMaps = savedMaps.filter((preset) => preset.id !== presetId);
    const fallbackPreset =
      nextSavedMaps[Math.max(0, presetIndex - 1)] ?? nextSavedMaps[0] ?? null;

    setSavedMaps(nextSavedMaps);

    if (activeSavedMapId === presetId) {
      if (fallbackPreset) {
        handleLoadSavedMap(fallbackPreset);
      } else {
        setActiveSavedMapId(null);
      }
    }

    addJournalEntry("map", "Вкладка карты удалена.");
    pushToast("Вкладка сцены удалена.", "info");
  };

  const handleResizeMap = () => {
    const nextCols = clamp(
      Number(gridColsInput) || DEFAULT_COLS,
      MIN_GRID,
      MAX_GRID,
    );
    const nextRows = clamp(
      Number(gridRowsInput) || DEFAULT_ROWS,
      MIN_GRID,
      MAX_GRID,
    );

    setMapState((current) => ({
      cols: nextCols,
      rows: nextRows,
      publicTiles: resizeTiles(
        current.publicTiles,
        current.cols,
        current.rows,
        nextCols,
        nextRows,
      ),
      gmTiles: resizeTiles(
        current.gmTiles,
        current.cols,
        current.rows,
        nextCols,
        nextRows,
      ),
    }));

    setTokens((current) =>
      current.map((token) => ({
        ...token,
        x: clamp(token.x, 0, nextCols - 1),
        y: clamp(token.y, 0, nextRows - 1),
      })),
    );

    addJournalEntry("map", `Размер карты изменён на ${nextCols}×${nextRows}.`);
  };

  const handleSendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    addJournalEntry("system", `${displayName}: ${trimmed}`);
    setChatInput("");
  };

  const handleRoll = () => {
    const result = rollFormula(diceFormula);
    if (!result) {
      addJournalEntry(
        "system",
        `Не удалось распознать формулу ${diceFormula}. Пример: 1d20+5.`,
      );
      return;
    }

    addJournalEntry(
      "dice",
      `${displayName} бросает ${diceFormula} → ${result.total} (${result.rolls.join(", ")}${result.modifier ? ` ${result.modifier > 0 ? "+" : "-"} ${Math.abs(result.modifier)}` : ""})`,
    );
  };

  const handleRandomLoot = () => {
    const nextLoot = rollTreasureFromTables(lootCrBand);
    setLootResult(nextLoot);
    addJournalEntry(
      "loot",
      `Лут из таблицы dnd.su (${lootCrBand}): ${nextLoot.details} Ссылка: ${nextLoot.link}`,
    );
    pushToast("Лут сгенерирован.", "success");
  };

  const handleRandomEvent = () => {
    const nextEvent =
      randomEventPool[Math.floor(Math.random() * randomEventPool.length)];
    setEventResult(nextEvent);
    addJournalEntry(
      "event",
      `Событие из dnd.su: ${nextEvent.title}. Ссылка: ${nextEvent.link}`,
    );
    pushToast("Случайное событие добавлено.", "success");
  };

  const updateSelectedSheet = useCallback(
    (updater: (sheet: CharacterSheet) => CharacterSheet) => {
      if (!selectedSheet || !canEditSheet(selectedSheet)) return;
      setSheets((current) =>
        current.map((sheet) =>
          sheet.id === selectedSheet.id ? updater(sheet) : sheet,
        ),
      );
    },
    [canEditSheet, selectedSheet],
  );

  const handleQuickRoll = useCallback(
    (sheet: CharacterSheet, label: string, formula: string) => {
      const result = rollFormula(formula);
      if (!result) {
        addJournalEntry(
          "system",
          `Не удалось выполнить бросок ${label} (${formula}).`,
        );
        return;
      }

      setDiceFormula(formula);
      addJournalEntry(
        "dice",
        `${sheet.name}: ${label} ${formula} → ${result.total} (${result.rolls.join(", ")}${result.modifier ? ` ${result.modifier > 0 ? "+" : "-"} ${Math.abs(result.modifier)}` : ""})`,
      );
    },
    [addJournalEntry],
  );

  const handleAdjustResourceTrack = useCallback(
    (
      resourceKey: "hitDice" | "rage" | "ki" | "sorceryPoints",
      delta: number,
    ) => {
      if (!selectedSheet) return;

      updateSelectedSheet((sheet) => {
        const resources = normalizeResources(sheet.resources);
        const track = resources[resourceKey]!;
        const nextCurrent = clamp(
          track.current + delta,
          0,
          Math.max(track.max, 0),
        );
        return {
          ...sheet,
          resources: {
            ...resources,
            [resourceKey]: {
              ...track,
              current: nextCurrent,
            },
          },
        };
      });

      addJournalEntry(
        "sheet",
        `${selectedSheet.name}: ${delta > 0 ? "восстановлен" : "потрачен"} ресурс «${getResourceLabel(resourceKey)}» (${delta > 0 ? "+" : ""}${delta}).`,
      );
    },
    [addJournalEntry, selectedSheet, updateSelectedSheet],
  );

  const handleResourceTrackLimitChange = useCallback(
    (
      resourceKey: "hitDice" | "rage" | "ki" | "sorceryPoints",
      field: "current" | "max",
      value: number,
    ) => {
      updateSelectedSheet((sheet) => {
        const resources = normalizeResources(sheet.resources);
        const track = resources[resourceKey]!;
        const normalizedValue = Math.max(0, value);
        const nextTrack =
          field === "max"
            ? {
                ...track,
                max: normalizedValue,
                current: Math.min(track.current, normalizedValue),
              }
            : { ...track, current: clamp(normalizedValue, 0, track.max) };
        return {
          ...sheet,
          resources: { ...resources, [resourceKey]: nextTrack },
        };
      });
    },
    [updateSelectedSheet],
  );

  const handleAdjustSpellSlot = useCallback(
    (index: number, delta: number) => {
      if (!selectedSheet) return;

      updateSelectedSheet((sheet) => {
        const resources = normalizeResources(sheet.resources);
        const spellSlots = [...(resources.spellSlots ?? [])];
        const slot = spellSlots[index] ?? { current: 0, max: 0 };
        spellSlots[index] = {
          ...slot,
          current: clamp(slot.current + delta, 0, Math.max(slot.max, 0)),
        };
        return { ...sheet, resources: { ...resources, spellSlots } };
      });

      addJournalEntry(
        "sheet",
        `${selectedSheet.name}: ${delta > 0 ? "восстановлен" : "потрачен"} слот ${index + 1} круга (${delta > 0 ? "+" : ""}${delta}).`,
      );
    },
    [addJournalEntry, selectedSheet, updateSelectedSheet],
  );

  const handleSpellSlotLimitChange = useCallback(
    (index: number, field: "current" | "max", value: number) => {
      updateSelectedSheet((sheet) => {
        const resources = normalizeResources(sheet.resources);
        const spellSlots = [...(resources.spellSlots ?? [])];
        const slot = spellSlots[index] ?? { current: 0, max: 0 };
        const normalizedValue = Math.max(0, value);
        spellSlots[index] =
          field === "max"
            ? {
                ...slot,
                max: normalizedValue,
                current: Math.min(slot.current, normalizedValue),
              }
            : { ...slot, current: clamp(normalizedValue, 0, slot.max) };
        return { ...sheet, resources: { ...resources, spellSlots } };
      });
    },
    [updateSelectedSheet],
  );

  const handleDeathSaveChange = useCallback(
    (field: "successes" | "failures", value: number) => {
      updateSelectedSheet((sheet) => {
        const resources = normalizeResources(sheet.resources);
        return {
          ...sheet,
          resources: {
            ...resources,
            deathSaves: {
              ...resources.deathSaves!,
              [field]: clamp(value, 0, 3),
            },
          },
        };
      });
    },
    [updateSelectedSheet],
  );

  const handleAdjustDeathSave = useCallback(
    (field: "successes" | "failures", delta: number) => {
      if (!selectedSheet) return;
      const resources = normalizeResources(selectedSheet.resources);
      const currentValue = resources.deathSaves?.[field] ?? 0;
      const nextValue = clamp(currentValue + delta, 0, 3);
      handleDeathSaveChange(field, nextValue);
      addJournalEntry(
        "sheet",
        `${selectedSheet.name}: ${field === "successes" ? "успехов" : "провалов"} death save теперь ${nextValue}.`,
      );
    },
    [addJournalEntry, handleDeathSaveChange, selectedSheet],
  );

  const handleExhaustionChange = useCallback(
    (value: number) => {
      updateSelectedSheet((sheet) => {
        const resources = normalizeResources(sheet.resources);
        return {
          ...sheet,
          resources: { ...resources, exhaustion: clamp(value, 0, 6) },
        };
      });
    },
    [updateSelectedSheet],
  );

  const handleAdjustExhaustion = useCallback(
    (delta: number) => {
      if (!selectedSheet) return;
      const resources = normalizeResources(selectedSheet.resources);
      const nextValue = clamp((resources.exhaustion ?? 0) + delta, 0, 6);
      handleExhaustionChange(nextValue);
      addJournalEntry(
        "sheet",
        `${selectedSheet.name}: уровень истощения ${nextValue}.`,
      );
    },
    [addJournalEntry, handleExhaustionChange, selectedSheet],
  );

  const handleApplyRest = useCallback(
    (mode: "short" | "long") => {
      if (!selectedSheet) return;
      updateSelectedSheet((sheet) => {
        const resources = normalizeResources(sheet.resources);
        return {
          ...sheet,
          resources: {
            ...resources,
            spellSlots: (resources.spellSlots ?? []).map((slot) =>
              mode === "long" ? { ...slot, current: slot.max } : slot,
            ),
            hitDice:
              mode === "long"
                ? { ...resources.hitDice!, current: resources.hitDice!.max }
                : resources.hitDice,
            rage: { ...resources.rage!, current: resources.rage!.max },
            ki: { ...resources.ki!, current: resources.ki!.max },
            sorceryPoints: {
              ...resources.sorceryPoints!,
              current: resources.sorceryPoints!.max,
            },
            deathSaves: { successes: 0, failures: 0 },
          },
        };
      });
      addJournalEntry(
        "sheet",
        `${selectedSheet.name}: применён ${mode === "long" ? "long rest" : "short rest"} к ресурсам персонажа.`,
      );
    },
    [addJournalEntry, selectedSheet, updateSelectedSheet],
  );

  const handleSheetChange = <K extends keyof CharacterSheet>(
    key: K,
    value: CharacterSheet[K],
  ) => {
    if (!selectedSheet || !canEditSheet(selectedSheet)) return;

    setSheets((current) =>
      current.map((sheet) =>
        sheet.id === selectedSheet.id ? { ...sheet, [key]: value } : sheet,
      ),
    );

    if (
      key === "hp" ||
      key === "maxHp" ||
      key === "ac" ||
      key === "speed" ||
      key === "name"
    ) {
      setTokens((current) =>
        current.map((token) => {
          if (token.sheetId !== selectedSheet.id) return token;

          return {
            ...token,
            name: key === "name" ? String(value) : token.name,
            short:
              key === "name" ? getTokenInitial(String(value)) : token.short,
            hp: key === "hp" ? Number(value) : token.hp,
            maxHp: key === "maxHp" ? Number(value) : token.maxHp,
            ac: key === "ac" ? Number(value) : token.ac,
            speed: key === "speed" ? Number(value) : token.speed,
          };
        }),
      );
    }
  };

  const handleProgressionModeChange = useCallback(
    (mode: CampaignConfig["progressionMode"]) => {
      setCampaignConfig((current) => ({
        ...current,
        progressionMode: mode,
        manualLevelUpUnlocked:
          mode === "milestone" ? current.manualLevelUpUnlocked : false,
      }));
    },
    [],
  );

  const handleAddXp = useCallback(
    (xpDelta: number) => {
      if (!selectedSheet) return;
      const result = applyXp(selectedSheet, campaignConfig, xpDelta);
      setSheets((current) =>
        current.map((sheet) =>
          sheet.id === selectedSheet.id
            ? { ...sheet, experience: result.character.experience }
            : sheet,
        ),
      );
      addJournalEntry(
        "sheet",
        `${selectedSheet.name}: мастер добавил ${xpDelta} XP.${result.progression.canLevelUp ? " Персонаж готов к повышению уровня." : ""}`,
      );
    },
    [addJournalEntry, campaignConfig, selectedSheet],
  );

  const handleToggleMilestoneReady = useCallback(() => {
    setCampaignConfig((current) => ({
      ...current,
      manualLevelUpUnlocked: !current.manualLevelUpUnlocked,
    }));
  }, []);

  const handleStartLevelUp = useCallback(() => {
    if (!selectedSheet) return;
    const draft =
      levelUpDrafts[selectedSheet.id] ??
      startLevelUp(selectedSheet, campaignConfig);
    setLevelUpDrafts((current) => ({ ...current, [selectedSheet.id]: draft }));
    setIsLevelUpOpen(true);
  }, [campaignConfig, levelUpDrafts, selectedSheet]);

  const handlePatchLevelUpDraft = useCallback(
    (patch: Partial<LevelUpDraft>) => {
      if (!selectedSheet) return;
      setLevelUpDrafts((current) => {
        const existing =
          current[selectedSheet.id] ??
          startLevelUp(selectedSheet, campaignConfig);
        const nextDraft = { ...existing, ...patch };
        nextDraft.previewSnapshot = buildLevelUpPreview(
          selectedSheet,
          campaignConfig,
          nextDraft,
        );
        return { ...current, [selectedSheet.id]: nextDraft };
      });
    },
    [campaignConfig, selectedSheet],
  );

  const handleConfirmLevelUp = useCallback(() => {
    if (!selectedSheet || !selectedLevelUpDraft) return;
    try {
      setLevelRollbackSnapshots((current) => ({
        ...current,
        [selectedSheet.id]: [
          ...(current[selectedSheet.id] ?? []),
          JSON.parse(JSON.stringify(selectedSheet)) as CharacterSheet,
        ],
      }));
      const nextSheet = confirmLevelUp(
        selectedSheet,
        campaignConfig,
        selectedLevelUpDraft,
      );
      setSheets((current) =>
        current.map((sheet) =>
          sheet.id === selectedSheet.id ? { ...sheet, ...nextSheet } : sheet,
        ),
      );
      setLevelUpDrafts((current) => ({
        ...current,
        [selectedSheet.id]: undefined,
      }));
      if (campaignConfig.progressionMode === "milestone") {
        setCampaignConfig((current) => ({
          ...current,
          manualLevelUpUnlocked: false,
        }));
      }
      setIsLevelUpOpen(false);
      addJournalEntry(
        "sheet",
        `${selectedSheet.name}: повышение уровня подтверждено. Теперь уровень ${nextSheet.level}.`,
      );
    } catch (error) {
      addJournalEntry(
        "system",
        error instanceof Error
          ? error.message
          : "Не удалось подтвердить level up.",
      );
    }
  }, [addJournalEntry, campaignConfig, selectedLevelUpDraft, selectedSheet]);

  const handleRollbackLastLevelUp = useCallback(() => {
    if (!selectedSheet) return;
    const snapshots = levelRollbackSnapshots[selectedSheet.id] ?? [];
    const previousSnapshot = snapshots[snapshots.length - 1];
    if (!previousSnapshot) return;
    setSheets((current) =>
      current.map((sheet) =>
        sheet.id === selectedSheet.id ? previousSnapshot : sheet,
      ),
    );
    setTokens((current) =>
      current.map((token) =>
        token.sheetId === selectedSheet.id
          ? {
              ...token,
              name: previousSnapshot.name,
              short: getTokenInitial(previousSnapshot.name),
              hp: previousSnapshot.hp,
              maxHp: previousSnapshot.maxHp,
              ac: previousSnapshot.ac,
              speed: previousSnapshot.speed,
            }
          : token,
      ),
    );
    setLevelRollbackSnapshots((current) => ({
      ...current,
      [selectedSheet.id]: snapshots.slice(0, -1),
    }));
    addJournalEntry(
      "sheet",
      `${selectedSheet.name}: последний подтверждённый level up откатан.`,
    );
  }, [addJournalEntry, levelRollbackSnapshots, selectedSheet]);

  const handleApplyCustomXp = useCallback(() => {
    const parsed = Number(customXpInput);
    if (!Number.isFinite(parsed) || parsed === 0) return;
    handleAddXp(parsed);
    setCustomXpInput("0");
  }, [customXpInput, handleAddXp]);

  const downloadJsonFile = useCallback((filename: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadCharacterCard = useCallback(() => {
    if (!selectedSheet) return;
    downloadJsonFile(
      `${selectedSheet.name.toLowerCase().replace(/\s+/g, "-") || "character"}.json`,
      selectedSheet,
    );
    addJournalEntry("sheet", `${selectedSheet.name}: карточка скачана в JSON.`);
  }, [addJournalEntry, downloadJsonFile, selectedSheet]);

  const handleSaveCharacterPreset = useCallback(() => {
    if (!selectedSheet) return;
    setSavedCharacters((current) => {
      const nextPreset: SavedCharacterPreset = {
        id: selectedSheet.id,
        name: selectedSheet.name,
        savedAt: new Date().toISOString(),
        sheet: JSON.parse(JSON.stringify(selectedSheet)) as CharacterSheet,
      };
      return [
        nextPreset,
        ...current.filter((item) => item.id !== selectedSheet.id),
      ];
    });
    addJournalEntry(
      "sheet",
      `${selectedSheet.name}: карточка сохранена в библиотеку комнаты.`,
    );
  }, [addJournalEntry, selectedSheet]);

  const handleLoadCharacterPreset = useCallback(
    (preset: SavedCharacterPreset) => {
      const nextIndex = playerTokens.length + 1;
      const tokenId = `player-${nextIndex}`;
      const sheetId = `sheet-${tokenId}`;
      const sheet = {
        ...(JSON.parse(JSON.stringify(preset.sheet)) as CharacterSheet),
        id: sheetId,
        tokenId,
      };
      const nextToken: RoomToken = {
        id: tokenId,
        name: sheet.name,
        short: getTokenInitial(sheet.name),
        kind: "player",
        color: "rgb(34 197 94)",
        x: clamp(1 + (nextIndex % 4), 0, cols - 1),
        y: clamp(1 + (nextIndex % 5), 0, rows - 1),
        hp: sheet.hp,
        maxHp: sheet.maxHp,
        ac: sheet.ac,
        speed: sheet.speed,
        owner: displayName,
        roleOwner: "player",
        sheetId,
        mapId: currentMapId,
        visionRadius: 3,
        statuses: [],
      };
      setTokens((current) => [...current, nextToken]);
      setSheets((current) => [...current, sheet]);
      setSelectedTokenId(tokenId);
      setJoinStep("ready");
      addJournalEntry(
        "sheet",
        `${preset.name}: карточка загружена из библиотеки в новую партию.`,
      );
    },
    [addJournalEntry, cols, currentMapId, displayName, playerTokens.length, rows],
  );

  const handleMoveGmPanel = useCallback(
    (panelId: MasterPanelId, direction: "up" | "down") => {
      setGmLayoutConfig((current) => {
        const index = current.order.indexOf(panelId);
        if (index === -1) return current;
        const nextIndex = direction === "up" ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= current.order.length) return current;
        const next = [...current.order];
        [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
        return { ...current, order: next };
      });
    },
    [],
  );

  const movePanelInOrder = useCallback(
    (
      current: MasterPanelId[],
      draggedId: MasterPanelId,
      targetId: MasterPanelId,
    ) => {
      if (draggedId === targetId) return current;
      const next = current.filter((item) => item !== draggedId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex === -1) return current;
      next.splice(targetIndex, 0, draggedId);
      return next;
    },
    [],
  );

  const handleDragStartMasterPanel = useCallback(
    (panelId: MasterPanelId, event: React.DragEvent<HTMLElement>) => {
      setDraggedMasterPanel(panelId);
      setDragOverMasterPanel(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", panelId);
    },
    [],
  );

  const handleDragOverMasterPanel = useCallback(
    (panelId: MasterPanelId, event: React.DragEvent<HTMLElement>) => {
      if (!draggedMasterPanel || draggedMasterPanel === panelId) return;
      event.preventDefault();
      if (dragOverMasterPanel !== panelId) {
        setDragOverMasterPanel(panelId);
      }
    },
    [dragOverMasterPanel, draggedMasterPanel],
  );

  const handleDropMasterPanel = useCallback(
    (targetId: MasterPanelId, event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      const sourceId =
        draggedMasterPanel ??
        (event.dataTransfer.getData("text/plain") as MasterPanelId);
      if (!sourceId) return;
      setGmLayoutConfig((current) => ({
        ...current,
        order: movePanelInOrder(current.order, sourceId, targetId),
      }));
      setDraggedMasterPanel(null);
      setDragOverMasterPanel(null);
    },
    [draggedMasterPanel, movePanelInOrder],
  );

  const handleGmPanelWidthChange = useCallback(
    (
      panelId: "admin" | "tokens" | "party" | "initiative" | "tools",
      width: number,
    ) => {
      const options = getMasterPanelDefinition(panelId).allowedSizes;
      const nextSize = options[Math.max(0, Math.min(options.length - 1, width))];
      setGmLayoutConfig((current) => ({
        ...current,
        panels: {
          ...current.panels,
          [panelId]: { size: nextSize },
        },
      }));
    },
    [],
  );

  const handleSetLayoutPanelSize = useCallback(
    (panelId: MasterPanelId, size: MasterLayoutSize) => {
      setGmLayoutConfig((current) => ({
        ...current,
        panels: {
          ...current.panels,
          [panelId]: { size },
        },
      }));
    },
    [],
  );

  const handleOpenShortcuts = useCallback(() => {
    pushToast("Shortcuts: Ctrl+K поиск, стрелки/drag для порядка панелей.", "info");
  }, [pushToast]);

  const handleFocusInitiativePanel = useCallback(() => {
    setMasterPreset("combat");
    const node = window.document.querySelector("[data-master-panel='initiative']");
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleRoomAuth = (forcedRole?: "gm" | "player") => {
    const name = displayName.trim() || "Без имени";
    const pass = passwordInput.trim();
    const requestedRole = forcedRole ?? joinIntent ?? "player";

    if (!pass) {
      setAuthError("Нужен пароль комнаты.");
      pushToast("Введите пароль комнаты.", "warning");
      return;
    }

    const currentState = roomAccessRegistry.get(roomId);

    if (!currentState) {
      if (requestedRole === "player") {
        setAuthError("Комнаты ещё нет. Для первого входа выберите роль мастера.");
        pushToast("Первый вход в комнату должен быть как мастер.", "warning");
        return;
      }
      roomAccessRegistry.set(roomId, { password: pass, gmExists: true });
      setRoomPassword(pass);
      setRole("gm");
      setJoinStep("ready");
      setAuthError("");
      setDisplayName(name);
      pushToast("Комната создана, вы вошли как мастер.", "success");
      addJournalEntry(
        "room",
        `${name} создал комнату как мастер и задал пароль.`,
      );
      return;
    }

    if (currentState.password !== pass) {
      setAuthError("Неверный пароль комнаты.");
      pushToast("Неверный пароль комнаты.", "warning");
      return;
    }

    if (requestedRole === "gm") {
      setAuthError("Комната уже создана. Войдите как игрок или наблюдатель.");
      pushToast("Роль мастера уже занята для этой комнаты.", "warning");
      return;
    }

    setRoomPassword(pass);
    setRole("player");
    setJoinStep("player-sheet");
    setAuthError("");
    setDisplayName(name);
    pushToast("Вход выполнен. Добавьте лист персонажа.", "success");
    addJournalEntry("room", `${name} присоединился к комнате как игрок.`);
  };

  const handleJoinAsSpectator = () => {
    const name = displayName.trim() || "Наблюдатель";
    setRole("spectator");
    setJoinStep("ready");
    setAuthError("");
    setDisplayName(name);
    pushToast("Вы вошли в режиме наблюдателя.", "info");
    addJournalEntry("room", `${name} присоединился к комнате как наблюдатель.`);
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1600);
      pushToast("Invite-ссылка скопирована.", "success");
    } catch {
      setAuthError("Не удалось скопировать ссылку автоматически.");
      pushToast("Не удалось скопировать ссылку.", "warning");
    }
  };

  const createPlayerCharacter = () => {
    const nextIndex = playerTokens.length + 1;
    const tokenId = `player-${nextIndex}`;
    const sheetId = `sheet-${tokenId}`;
    const name = displayName || `Игрок ${nextIndex}`;

    const nextToken: RoomToken = {
      id: tokenId,
      name,
      short: getTokenInitial(name),
      kind: "player",
      color: "rgb(96 165 250)",
      x: clamp(1 + (nextIndex % 4), 0, cols - 1),
      y: clamp(1 + (nextIndex % 5), 0, rows - 1),
      hp: 12,
      maxHp: 12,
      ac: 12,
      speed: 30,
      owner: displayName,
      roleOwner: "player",
      sheetId,
      mapId: currentMapId,
      visionRadius: 3,
      statuses: [],
    };

    const nextSheet: CharacterSheet = createEmptyCharacterSheet(
      sheetId,
      tokenId,
      name,
    );

    setTokens((current) => [...current, nextToken]);
    setSheets((current) => [...current, nextSheet]);
    setSelectedTokenId(tokenId);
    setJoinStep("ready");
    addJournalEntry("sheet", `${displayName} создал новый лист персонажа.`);
    pushToast("Лист персонажа создан.", "success");
  };

  const handleAddNpcToMap = useCallback(() => {
    if (role !== "gm") return;

    const trimmedName = npcNameInput.trim() || "Новый NPC";
    const npcIndex =
      tokens.filter((token) => token.kind === "npc" || token.kind === "monster")
        .length + 1;
    const prefix = npcKindInput === "monster" ? "monster" : "npc";
    const nextToken: RoomToken = {
      id: `${prefix}-${Date.now()}`,
      name: trimmedName,
      short: getTokenInitial(trimmedName),
      kind: npcKindInput,
      color: npcColorInput,
      x:
        npcPlacementBoard === "gm"
          ? clamp(cols - 2, 0, cols - 1)
          : clamp(1 + (npcIndex % 5), 0, cols - 1),
      y:
        npcPlacementBoard === "gm"
          ? clamp(1 + (npcIndex % 4), 0, rows - 1)
          : clamp(rows - 2, 0, rows - 1),
      hp: Number(npcHpInput) || 1,
      maxHp: Number(npcHpInput) || 1,
      ac: Number(npcAcInput) || 10,
      speed: Number(npcSpeedInput) || 30,
      owner: displayName || "GM",
      roleOwner: "gm",
      gmOnly: npcPlacementBoard === "gm",
      mapId: currentMapId,
      visionRadius: npcPlacementBoard === "gm" ? 0 : 3,
      statuses: [],
    };

    setTokens((current) => [...current, nextToken]);
    setSelectedTokenId(nextToken.id);
    addJournalEntry(
      "map",
      `${trimmedName} добавлен на ${npcPlacementBoard === "gm" ? "скрытую карту мастера" : "публичную карту"} как ${npcKindInput === "monster" ? "монстр" : "NPC"}.`,
    );
    pushToast(`${trimmedName} добавлен на карту.`, "success");
  }, [
    addJournalEntry,
    cols,
    displayName,
    npcAcInput,
    npcColorInput,
    npcHpInput,
    npcKindInput,
    npcNameInput,
    npcPlacementBoard,
    npcSpeedInput,
    pushToast,
    role,
    rows,
    currentMapId,
    tokens,
  ]);

  const handleGenerateRumors = useCallback(() => {
    if (role !== "gm") return;
    const rumors = buildRumorTable(rumorPromptInput);
    setRumorResults(rumors);
    addJournalEntry(
      "event",
      `Сгенерирована таблица слухов для темы: ${rumorPromptInput.trim() || "городские слухи"}.`,
    );
  }, [addJournalEntry, role, rumorPromptInput]);

  const handleImportCharacterJson = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const importedSheet = (() => {
        if (
          parsed &&
          typeof parsed === "object" &&
          "stats" in parsed &&
          "heroClass" in parsed &&
          "name" in parsed
        ) {
          return parsed as Partial<CharacterSheet>;
        }
        return parseLongStoryShortCharacter(parsed);
      })();
      const imported = importedSheet;
      if (!imported) {
        addJournalEntry("system", "Не удалось прочитать JSON персонажа.");
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
        kind: "player",
        color: "rgb(34 197 94)",
        x: clamp(1 + (nextIndex % 4), 0, cols - 1),
        y: clamp(1 + (nextIndex % 5), 0, rows - 1),
        hp,
        maxHp,
        ac,
        speed,
        owner: displayName,
        roleOwner: "player",
        sheetId,
        mapId: currentMapId,
        visionRadius: 3,
        statuses: [],
      };

      const nextSheet: CharacterSheet = {
        ...createEmptyCharacterSheet(sheetId, tokenId, characterName),
        ...imported,
        id: sheetId,
        tokenId,
        name: characterName,
        hp,
        maxHp,
        ac,
        speed,
        stats: imported.stats ?? createDefaultStats(),
        notes: imported.notes || "Импортировано из Long Story Short.",
        inventory: imported.inventory || "",
        spells: imported.spells || "",
      };

      setTokens((current) => [...current, nextToken]);
      setSheets((current) => [...current, nextSheet]);
      setSelectedTokenId(tokenId);
      setJoinStep("ready");
      addJournalEntry(
        "sheet",
        `${displayName} импортировал персонажа из JSON (${file.name}).`,
      );
    } catch {
      addJournalEntry("system", `Файл ${file.name} не является валидным JSON.`);
    }
  };

  const handleTokenSetting = (
    tokenId: string,
    key: "gmOnly" | "hiddenFromPlayers" | "visionRadius",
    value: boolean | number,
  ) => {
    if (role !== "gm") return;
    setTokens((current) =>
      current.map((token) =>
        token.id === tokenId
          ? {
              ...token,
              [key]: key === "visionRadius" ? Number(value) : value,
            }
          : token,
      ),
    );
  };

  const handleTokenMapLinkChange = (tokenId: string, linkedMapId: string) => {
    if (role !== "gm") return;
    setTokens((current) =>
      current.map((token) =>
        token.id === tokenId
          ? { ...token, linkedMapId: linkedMapId || undefined }
          : token,
      ),
    );
  };

  const handleToggleTokenStatus = useCallback(
    (tokenId: string, status: TokenStatusKey) => {
      if (role !== "gm") return;
      const token = tokens.find((entry) => entry.id === tokenId);
      if (!token || token.kind === "object") return;

      const hasStatus = (token.statuses ?? []).includes(status);
      const statusLabel = getStatusMeta(status)?.label ?? status;

      setTokens((current) =>
        current.map((entry) =>
          entry.id === tokenId
            ? {
                ...entry,
                statuses: hasStatus
                  ? (entry.statuses ?? []).filter((item) => item !== status)
                  : [...(entry.statuses ?? []), status],
              }
            : entry,
        ),
      );
      addJournalEntry(
        "system",
        `${token.name}: ${hasStatus ? "снят" : "добавлен"} статус ${statusLabel}.`,
      );
    },
    [addJournalEntry, role, tokens],
  );

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSheet || !canEditSheet(selectedSheet)) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setSheets((current) =>
        current.map((sheet) =>
          sheet.id === selectedSheet.id
            ? { ...sheet, avatarUrl: result }
            : sheet,
        ),
      );
      addJournalEntry(
        "sheet",
        `Для персонажа ${selectedSheet.name} загружен портрет.`,
      );
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  useEffect(() => {
    setInitiative((current) =>
      syncInitiativeWithTokens(current, tokens, sheets),
    );
  }, [tokens, sheets]);

  const paintedCells = activeTiles.filter(
    (tile) => tile.terrain !== DEFAULT_TERRAIN,
  ).length;
  const foggedCells = activeTiles.filter((tile) => tile.fog).length;
  const obstacleCells = activeTiles.filter((tile) => tile.obstacle).length;
  const textureCells = activeTiles.filter((tile) => tile.texture).length;
  const furnitureCells = activeTiles.filter((tile) => tile.furniture).length;

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
        <RoomHeader
          roomId={roomId}
          title="Arcane Table: мастерская сцены"
          description="Две карты, видимость игроков, токены, лут, события и журнал собраны в один рабочий стол. Состояние пока сохраняется локально и экспортируется JSON-файлом."
          inviteCopied={inviteCopied}
          saveLabel={
            saveState === "error"
              ? "ошибка"
              : lastSavedAt
                ? `последнее в ${lastSavedAt}`
                : "ожидание"
          }
          canManageFiles={role === "gm" || joinStep !== "ready"}
          onCopyInviteLink={handleCopyInviteLink}
          onUploadMap={handleUploadMap}
          onImportMapJson={handleImportMapJson}
          onExportMapJson={handleExportMapJson}
        />

        {role === "gm" || joinStep !== "ready" ? (
          <CompactSection
            title="Сохранённые сцены"
            description="Все карты и JSON на месте, но блок теперь можно свернуть, чтобы не занимал экран."
            badge={`${savedMaps.length || 0} сцен`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mt-1 text-sm text-slate-300">
                  Каждая вкладка хранит пару карт: публичную для игроков и
                  скрытую для мастера. При переключении меняются обе карты
                  сразу.
                </div>
              </div>
              <div className="flex w-full max-w-xl gap-2">
                <input
                  value={mapPresetName}
                  onChange={(event) => setMapPresetName(event.target.value)}
                  placeholder="Название вкладки карты"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                />
                <button
                  onClick={handleSaveMap}
                  className="rounded-full bg-emerald-500 px-4 py-3 text-sm font-medium text-slate-950"
                >
                  Сохранить как вкладку
                </button>
                <button
                  onClick={handleExportMapJson}
                  className="rounded-full border border-white/10 px-4 py-3 text-sm font-medium text-slate-200"
                >
                  Экспорт JSON
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {savedMaps.length ? (
                savedMaps.map((preset, index) => (
                  <div key={preset.id} className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadSavedMap(preset)}
                      className={boardButtonClass(
                        activeSavedMapId === preset.id,
                      )}
                    >
                      {preset.name}
                    </button>
                    {index > 0 ? (
                      <button
                        onClick={() => handleDeleteSavedMap(preset.id)}
                        className="rounded-full border border-white/10 px-3 py-2 text-sm text-rose-300"
                        aria-label={`Удалить вкладку ${preset.name}`}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400">
                  Пока нет сохранённых вкладок. Сохраните текущую сцену, чтобы
                  быстро переключаться между наборами карт.
                </div>
              )}
            </div>
          </CompactSection>
        ) : null}

        {role !== "player" || joinStep !== "ready" ? (
          <CompactSection
            title="Сценарий: Шёлковый престол"
            description="Подготовка всех ключевых локаций отдельными картами с NPC-токенами и переходами из Главного салона."
            badge={`${silkThroneLocations.length} локаций`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleLoadSilkThroneScenario}
                className="rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Развернуть все карты «Шёлкового престола»
              </button>
              <div className="text-xs text-slate-400">
                Главный зал назначается основной картой, из него появляются токены-переходы во все остальные сцены.
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {silkThroneLocations.map((location) => (
                <article
                  key={`silk-location-${location.id}`}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-xs text-slate-200"
                >
                  <div className="font-semibold text-white">{location.name}</div>
                  <div className="mt-1 text-slate-400">{location.atmosphere}</div>
                  <div className="mt-2 space-y-1">
                    <p><span className="text-slate-400">Кто там:</span> {location.usualGuests}</p>
                    <p><span className="text-slate-400">Зачем сцена:</span> {location.sceneGoal}</p>
                    <p><span className="text-slate-400">Что получить:</span> {location.rewards}</p>
                    <p><span className="text-rose-300">Опасность:</span> {location.danger}</p>
                    <p><span className="text-cyan-300">NPC токены:</span> {location.npcs.map((npc) => npc.name).join(", ")}</p>
                  </div>
                </article>
              ))}
            </div>
          </CompactSection>
        ) : null}

        {joinStep !== "ready" ? (
          <JoinGate
            role={role}
            joinStep={joinStep}
            joinIntent={joinIntent}
            displayName={displayName}
            passwordInput={passwordInput}
            authError={authError}
            onJoinIntentChange={setJoinIntent}
            onDisplayNameChange={setDisplayName}
            onPasswordInputChange={setPasswordInput}
            onJoinAsSpectator={handleJoinAsSpectator}
            onRoomAuth={handleRoomAuth}
            onCreatePlayerCharacter={createPlayerCharacter}
            onImportCharacterJson={handleImportCharacterJson}
          />
        ) : null}

        {joinStep === "ready" ? (
          <section className="card px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  Быстрый прогресс по старту
                </div>
                <div className="text-xs text-slate-400">
                  Отметки обновляются автоматически по вашим действиям в комнате.
                </div>
              </div>
              <span className="badge">
                {
                  onboardingSteps.filter((step) => step.done).length
                }/{onboardingSteps.length}
              </span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {onboardingSteps.map((step) => (
                <div
                  key={step.id}
                  className={`rounded-2xl border px-3 py-2 text-sm ${step.done ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-slate-900/60 text-slate-200"}`}
                >
                  {step.done ? "✓ " : "○ "}
                  {step.label}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <RoomStatusGrid
          role={role}
          mapName={mapName}
          roomPassword={roomPassword}
          selectedTokenName={selectedToken?.name ?? "—"}
          zoomPercent={Math.round(zoom * 100)}
          playerVisionLabel={
            playerTokens
              .map((token) => `${token.name} ${token.visionRadius ?? 3}`)
              .join(" • ") || "нет игроков"
          }
        />

        {role === "gm" ? (
          <MasterWorkspaceHeader
            masterPreset={masterPreset}
            onPresetChange={setMasterPreset}
            activeGroups={activeMasterGroups}
            groupLabels={masterGroupLabels}
            onOpenLayoutEditor={() => setIsLayoutEditorOpen(true)}
            onOpenLevelUpDrawer={() => setIsLevelUpOpen(true)}
            levelUpEnabled={Boolean(selectedLevelUpDraft && selectedLevelUpPreview)}
            globalSearch={globalSearch}
            onGlobalSearchChange={setGlobalSearch}
            onFocusInitiativePanel={handleFocusInitiativePanel}
            onOpenShortcuts={handleOpenShortcuts}
            initiativeOrder={initiativeOrder}
          />
        ) : null}

        <section className="space-y-4">
          <div
            className={
              role === "gm"
                ? "master-workspace-grid"
                : "grid gap-4 xl:grid-cols-1"
            }
          >
            {role === "gm" ? (
              <div
                className="space-y-2"
              >
                <div className="w-full max-w-6xl space-y-2">
                  {masterPanelModels
                  .filter(
                    (panel) =>
                      panel.id === "admin" &&
                      panel.visibility &&
                      panel.matchesSearch,
                  )
                  .map((panel) => {
                    const panelId = panel.id;
                    return (
                    <div
                      key={panelId}
                      onDragOver={(event) =>
                        handleDragOverMasterPanel(panelId, event)
                      }
                      onDrop={(event) => handleDropMasterPanel(panelId, event)}
                      onDragEnd={() => {
                        setDraggedMasterPanel(null);
                        setDragOverMasterPanel(null);
                      }}
                      style={{
                        order: gmPanelOrder.indexOf(panelId),
                        gridColumn: `span ${getMasterPanelGridSpan(panelId, gmPanelSizes[panelId])} / span ${getMasterPanelGridSpan(panelId, gmPanelSizes[panelId])}`,
                      }}
                      className={`space-y-2 rounded-3xl ${draggedMasterPanel === panelId ? "ring-2 ring-cyan-400/50" : ""} ${dragOverMasterPanel === panelId ? "ring-2 ring-fuchsia-400/60" : ""}`}
                    >
                      <div
                        draggable={role === "gm"}
                        onDragStart={(event) =>
                          role === "gm" &&
                          handleDragStartMasterPanel(panelId, event)
                        }
                        className="flex min-w-0 cursor-grab flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-slate-950/40 px-3 py-2 text-xs text-slate-300 active:cursor-grabbing"
                      >
                        <span className="font-medium text-white">
                          Панель мастера:{" "}
                          <AdaptiveLabel
                            full={masterPanelMeta[panelId].title}
                            short={masterPanelShortLabels[panelId]}
                            icon={masterPanelIcons[panelId]}
                          />
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMoveGmPanel(panelId, "up")}
                          disabled={gmPanelOrder.indexOf(panelId) === 0}
                          className="rounded-full border border-white/10 px-2 py-1 disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveGmPanel(panelId, "down")}
                          disabled={
                            gmPanelOrder.indexOf(panelId) ===
                            gmPanelOrder.length - 1
                          }
                          className="rounded-full border border-white/10 px-2 py-1 disabled:opacity-40"
                        >
                          ↓
                        </button>
                        <span className="text-slate-500">Размер</span>
                        <input
                          type="range"
                          min={0}
                          max={getMasterPanelDefinition(panelId).allowedSizes.length - 1}
                          step={1}
                          value={Math.max(0, getMasterPanelDefinition(panelId).allowedSizes.indexOf(gmPanelSizes[panelId]))}
                          onChange={(event) =>
                            handleGmPanelWidthChange(
                              panelId,
                              Number(event.target.value),
                            )
                          }
                        />
                      </div>
                      {panelId === "admin" ? (
                        <CompactSection
                          title="Сцена · Админ-панель мастера"
                          description="Карта, кисти, палитры и параметры сцены в одном месте."
                          badge="только мастер"
                          defaultOpen
                          className="xl:sticky xl:top-20"
                        >
                          <div className="mt-4 flex flex-wrap gap-2 text-sm">
                            <button
                              className={boardButtonClass(
                                activeBoard === "public",
                              )}
                              onClick={() => setActiveBoard("public")}
                            >
                              Публичная карта
                            </button>
                            <button
                              className={boardButtonClass(activeBoard === "gm")}
                              onClick={() => setActiveBoard("gm")}
                            >
                              Скрытая карта мастера
                            </button>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                            <label className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                              <span>Туман войны для игроков</span>
                              <input
                                type="checkbox"
                                checked={useFogOfWar}
                                onChange={(event) =>
                                  setUseFogOfWar(event.target.checked)
                                }
                              />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                              <span>Игроки смотрят карту мастера</span>
                              <input
                                type="checkbox"
                                checked={useSharedGmMapForPlayers}
                                onChange={(event) =>
                                  setUseSharedGmMapForPlayers(
                                    event.target.checked,
                                  )
                                }
                              />
                            </label>
                          </div>
                          {!useSharedGmMapForPlayers ? (
                            <button
                              type="button"
                              className="mt-3 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100"
                              onClick={() => {
                                setTilesForBoard("public", [...mapState.gmTiles]);
                                addJournalEntry(
                                  "map",
                                  "Публичная карта синхронизирована с картой мастера.",
                                );
                              }}
                            >
                              Синхронизировать: карта мастера → карта игроков
                            </button>
                          ) : null}
                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm [&>*]:min-w-0">
                            {toolMeta.map((item) => (
                              <button
                                key={item.value}
                                onClick={() => {
                                  setTool(item.value);
                                  if (item.layer)
                                    setSelectedColor(
                                      layerPalette[item.layer][0],
                                    );
                                }}
                                className={`min-w-0 rounded-2xl border px-3 py-2 ${tool === item.value ? "border-fuchsia-400 bg-fuchsia-500/15 text-white" : "border-white/10 text-slate-300"}`}
                              >
                                <AdaptiveLabel
                                  full={item.label}
                                  short={
                                    item.value === "terrain"
                                      ? "Поле"
                                      : item.value === "obstacle"
                                        ? "Стены"
                                        : item.value === "texture"
                                          ? "Текст."
                                          : item.value === "furniture"
                                            ? "Объекты"
                                            : item.value === "move"
                                              ? "Токены"
                                              : item.value === "fog"
                                                ? "Туман"
                                                : "Ластик"
                                  }
                                  className="inline-block max-w-full truncate"
                                />
                              </button>
                            ))}
                          </div>
                          <div className="mt-4">
                            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                              Палитра активного слоя
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {activePalette.map((color) => (
                                <button
                                  key={`${tool}-${color}`}
                                  onClick={() => setSelectedColor(color)}
                                  className={`h-9 w-9 rounded-full border ${selectedColor === color ? "border-white" : "border-white/20"}`}
                                  style={{ backgroundColor: color }}
                                  aria-label={`Выбрать цвет ${color}`}
                                />
                              ))}
                            </div>
                          </div>
                          {tool === "terrain" ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
                              <div className="mb-2 uppercase tracking-wide text-slate-400">
                                Готовые покрытия
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {terrainBrushes.map((brush) => (
                                  <button
                                    key={brush.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTerrainPreset(brush.id);
                                      setSelectedColor(brush.color);
                                    }}
                                    className={`rounded-xl border px-2.5 py-1.5 ${selectedTerrainPreset === brush.id ? "border-emerald-400 bg-emerald-500/20 text-white" : "border-white/10 text-slate-300"}`}
                                  >
                                    {brush.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {tool === "texture" ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
                              <div className="mb-2 uppercase tracking-wide text-slate-400">
                                Готовые текстуры
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {textureBrushes.map((brush) => (
                                  <button
                                    key={brush.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTexturePreset(brush.id);
                                      setSelectedColor(brush.color);
                                    }}
                                    className={`rounded-xl border px-2.5 py-1.5 ${selectedTexturePreset === brush.id ? "border-emerald-400 bg-emerald-500/20 text-white" : "border-white/10 text-slate-300"}`}
                                  >
                                    {brush.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {tool === "obstacle" ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
                              <div className="mb-2 uppercase tracking-wide text-slate-400">
                                Библиотека препятствий
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {obstacleBrushes.map((brush) => (
                                  <button
                                    key={brush.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedObstaclePreset(brush.id);
                                      setSelectedColor(brush.color);
                                    }}
                                    className={`rounded-xl border px-2.5 py-1.5 ${selectedObstaclePreset === brush.id ? "border-emerald-400 bg-emerald-500/20 text-white" : "border-white/10 text-slate-300"}`}
                                  >
                                    {brush.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {tool === "furniture" ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
                              <div className="mb-2 uppercase tracking-wide text-slate-400">
                                Библиотека объектов
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {furnitureBrushes.map((brush) => (
                                  <button
                                    key={brush.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedFurniturePreset(brush.id);
                                      setSelectedColor(brush.color);
                                    }}
                                    className={`rounded-xl border px-2.5 py-1.5 ${selectedFurniturePreset === brush.id ? "border-emerald-400 bg-emerald-500/20 text-white" : "border-white/10 text-slate-300"}`}
                                  >
                                    {brush.label}
                                  </button>
                                ))}
                              </div>
                              {selectedFurniturePreset === "stage" ? (
                                <div className="mt-3">
                                  <div className="mb-2 uppercase tracking-wide text-slate-400">
                                    Текстура сцены
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      { id: "wood", label: "Доски" },
                                      { id: "stone", label: "Камень" },
                                      { id: "velvet", label: "Бархат" },
                                    ].map((variant) => (
                                      <button
                                        key={variant.id}
                                        type="button"
                                        onClick={() =>
                                          setSelectedStageVariant(
                                            variant.id as
                                              | "wood"
                                              | "stone"
                                              | "velvet",
                                          )
                                        }
                                        className={`rounded-xl border px-2.5 py-1.5 ${selectedStageVariant === variant.id ? "border-violet-400 bg-violet-500/20 text-white" : "border-white/10 text-slate-300"}`}
                                      >
                                        {variant.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {tool === "obstacle" || tool === "furniture" ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
                              <div className="mb-2 uppercase tracking-wide text-slate-400">
                                Размер и привязка объекта
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { value: "full", label: "1×1" },
                                  { value: "half", label: "1/2" },
                                  { value: "quarter", label: "1/4" },
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      setStampScale(
                                        option.value as
                                          | "full"
                                          | "half"
                                          | "quarter",
                                      )
                                    }
                                    className={`rounded-xl border px-2.5 py-1.5 ${stampScale === option.value ? "border-fuchsia-400 bg-fuchsia-500/20 text-white" : "border-white/10 text-slate-300"}`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {[
                                  { value: "center", label: "Центр" },
                                  { value: "tl", label: "↖" },
                                  { value: "tr", label: "↗" },
                                  { value: "bl", label: "↙" },
                                  { value: "br", label: "↘" },
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      setStampAnchor(
                                        option.value as
                                          | "center"
                                          | "tl"
                                          | "tr"
                                          | "bl"
                                          | "br",
                                      )
                                    }
                                    className={`rounded-xl border px-2.5 py-1.5 ${stampAnchor === option.value ? "border-cyan-400 bg-cyan-500/20 text-white" : "border-white/10 text-slate-300"}`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <div className="mt-4 space-y-3 text-sm text-slate-300">
                            <div className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400">
                              Масштаб карты теперь закреплён поверх карты (кнопки +/−,
                              слайдер и fit).
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                              <div>Покрытие: {paintedCells}</div>
                              <div>Туман: {foggedCells}</div>
                              <div>Препятствия: {obstacleCells}</div>
                              <div>Текстуры: {textureCells}</div>
                              <div>Мебель: {furnitureCells}</div>
                            </div>
                          </div>
                          <div className="mt-4 rounded-2xl border border-white/10 p-3 text-sm text-slate-300">
                            <div className="mb-3 text-xs uppercase tracking-wide text-slate-400">
                              Размер поля
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={gridColsInput}
                                onChange={(event) =>
                                  setGridColsInput(event.target.value)
                                }
                                className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white"
                                placeholder="Колонки"
                              />
                              <input
                                value={gridRowsInput}
                                onChange={(event) =>
                                  setGridRowsInput(event.target.value)
                                }
                                className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white"
                                placeholder="Строки"
                              />
                            </div>
                            <button
                              onClick={handleResizeMap}
                              className="mt-3 w-full rounded-full bg-cyan-500 px-4 py-3 font-medium text-slate-950"
                            >
                              Применить размер
                            </button>
                            <div className="mt-2 text-xs text-slate-400">
                              Любой формат в диапазоне от {MIN_GRID}×{MIN_GRID}{" "}
                              до {MAX_GRID}×{MAX_GRID}.
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setTilesForBoard(
                                activeBoard,
                                createEmptyMap(cols, rows),
                              );
                              addJournalEntry(
                                "map",
                                `Карта ${activeBoard === "public" ? "игроков" : "мастера"} очищена до базовой сетки.`,
                              );
                            }}
                            className="mt-4 w-full rounded-full border border-white/10 px-4 py-3 text-sm text-slate-200"
                          >
                            Очистить активную карту
                          </button>
                        </CompactSection>
                      ) : (
                        <CompactSection
                          title="Токены"
                          description="Полный список токенов со статусами и обзором игроков."
                          badge={`${tokens.length} шт.`}
                        >
                          <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1 text-sm">
                            {tokens.map((token) => (
                              <div
                                key={token.id}
                                className={`overflow-hidden rounded-2xl border px-3 py-3 ${selectedTokenId === token.id ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/8"}`}
                              >
                                <button
                                  onClick={() => setSelectedTokenId(token.id)}
                                  className="w-full text-left"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-white">
                                        {token.name}
                                      </div>
                                      <div className="truncate text-slate-400">
                                        {token.kind} •{" "}
                                        {cellCoordinate(token.x, token.y)}
                                      </div>
                                    </div>
                                    <span className="max-w-[7rem] truncate text-right text-xs text-slate-300 sm:max-w-none">
                                      HP {token.hp}/{token.maxHp}
                                    </span>
                                  </div>
                                </button>
                                <div className="mt-3 grid gap-2 text-xs text-slate-300">
                                  <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
                                    <span>Скрыт от игроков</span>
                                    <input
                                      type="checkbox"
                                      checked={Boolean(token.gmOnly)}
                                      onChange={(event) =>
                                        handleTokenSetting(
                                          token.id,
                                          "gmOnly",
                                          event.target.checked,
                                        )
                                      }
                                    />
                                  </label>
                                  <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
                                    <span>В скрытности (не виден)</span>
                                    <input
                                      type="checkbox"
                                      checked={Boolean(token.hiddenFromPlayers)}
                                      onChange={(event) =>
                                        handleTokenSetting(
                                          token.id,
                                          "hiddenFromPlayers",
                                          event.target.checked,
                                        )
                                      }
                                    />
                                  </label>
                                  <label className="rounded-xl border border-white/10 px-3 py-2">
                                    <div className="mb-1">Токен-переход по карте</div>
                                    <select
                                      value={token.linkedMapId ?? ""}
                                      onChange={(event) =>
                                        handleTokenMapLinkChange(
                                          token.id,
                                          event.target.value,
                                        )
                                      }
                                      className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-xs text-white"
                                    >
                                      <option value="">нет</option>
                                      <option value="main">Основная карта</option>
                                      {savedMaps.map((preset) => (
                                        <option
                                          key={`token-link-${token.id}-${preset.id}`}
                                          value={preset.id}
                                        >
                                          {preset.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  {token.kind === "player" ? (
                                    <label className="rounded-xl border border-white/10 px-3 py-2">
                                      <div className="mb-2">
                                        Обзор игрока: {token.visionRadius ?? 3}{" "}
                                        клетки
                                      </div>
                                      <input
                                        type="range"
                                        min="1"
                                        max="8"
                                        value={token.visionRadius ?? 3}
                                        onChange={(event) =>
                                          handleTokenSetting(
                                            token.id,
                                            "visionRadius",
                                            Number(event.target.value),
                                          )
                                        }
                                        className="w-full"
                                      />
                                    </label>
                                  ) : null}
                                  {token.kind !== "object" ? (
                                    <div className="rounded-xl border border-white/10 px-3 py-3">
                                      <div className="mb-2 flex items-center justify-between gap-2">
                                        <span>Статусы и эффекты</span>
                                        <span className="text-[11px] text-slate-500">
                                          {(token.statuses ?? []).length
                                            ? `${(token.statuses ?? []).length} active`
                                            : "нет активных"}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {tokenStatusCatalog.map((status) => {
                                          const isActive = (
                                            token.statuses ?? []
                                          ).includes(status.key);
                                          return (
                                            <button
                                              key={`${token.id}-${status.key}`}
                                              type="button"
                                              onClick={() =>
                                                handleToggleTokenStatus(
                                                  token.id,
                                                  status.key,
                                                )
                                              }
                                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${isActive ? status.colorClass : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"}`}
                                              title={status.description}
                                            >
                                              {status.short}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CompactSection>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div
              className={
                role === "gm"
                  ? "contents"
                  : "min-w-0 flex flex-col gap-4 xl:col-span-1"
              }
            >
              <div
                onDragOver={(event) =>
                  role === "gm" && handleDragOverMasterPanel("party", event)
                }
                onDrop={(event) =>
                  role === "gm" && handleDropMasterPanel("party", event)
                }
                onDragEnd={() => {
                  setDraggedMasterPanel(null);
                  setDragOverMasterPanel(null);
                }}
                className={`space-y-2 rounded-3xl ${draggedMasterPanel === "party" ? "ring-2 ring-cyan-400/50" : ""} ${dragOverMasterPanel === "party" ? "ring-2 ring-fuchsia-400/60" : ""} ${role !== "gm" && !masterPanelSearchMap.party ? "hidden" : ""} ${role === "gm" ? `master-side-drawer fixed inset-y-0 right-0 h-dvh max-h-dvh overflow-y-auto p-4 pt-28 ${isCreaturesDrawerOpen && creaturesDrawerTab === "party" ? "translate-x-0" : "translate-x-full pointer-events-none"}` : ""}`}
                style={
                  role === "gm"
                    ? { ["--drawer-width" as string]: `${creaturesDrawerWidth}px` }
                    : {
                        order: gmPanelOrder.indexOf("party"),
                        gridColumn: `span ${getMasterPanelGridSpan("party", gmPanelSizes.party)} / span ${getMasterPanelGridSpan("party", gmPanelSizes.party)}`,
                      }
                }
              >
                <div
                  className={
                    role === "gm" ? "w-full min-w-0 space-y-2" : ""
                  }
                >
                <CompactSection
                  title="Существа и персонажи группы"
                  description="Правая шторка: карточки, импорт/экспорт и управление составом группы."
                  badge="состав группы"
                  defaultOpen
                >
                  <div className="mt-4 flex flex-wrap gap-3 [&>*]:min-w-0">
                    <button
                      onClick={createPlayerCharacter}
                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-white"
                    >
                      <AdaptiveLabel
                        full="Добавить пустую карточку"
                        short="+ карточка"
                      />
                    </button>
                    <label className="cursor-pointer rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-white">
                      Импортировать JSON персонажа
                      <input
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={handleImportCharacterJson}
                      />
                    </label>
                    <label
                      className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${selectedSheet && canEditSheet(selectedSheet) ? "border-white/10 text-slate-200" : "border-white/5 text-slate-500"}`}
                    >
                      Загрузить фото персонажа
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={
                          !selectedSheet || !canEditSheet(selectedSheet)
                        }
                      />
                    </label>
                    <button
                      onClick={handleSaveCharacterPreset}
                      disabled={!selectedSheet}
                      className="rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-100 disabled:opacity-50"
                    >
                      Сохранить карточку
                    </button>
                    <button
                      onClick={handleDownloadCharacterCard}
                      disabled={!selectedSheet}
                      className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 disabled:opacity-50"
                    >
                      Скачать JSON
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Поддержан JSON в формате longstoryshort.app, включая
                    вложенный блок `data`, характеристики, биографию, черты,
                    инвентарь и ссылки на аватар.
                  </div>
                  {savedCharacters.length ? (
                    <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Библиотека карточек для новых партий
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {savedCharacters.map((preset) => (
                          <div
                            key={preset.id}
                            className="rounded-2xl border border-white/8 px-3 py-3"
                          >
                            <div className="font-medium text-white">
                              {preset.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Сохранено:{" "}
                              {new Date(preset.savedAt).toLocaleString("ru-RU")}
                            </div>
                            <button
                              onClick={() => handleLoadCharacterPreset(preset)}
                              className="mt-3 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
                            >
                              Подгрузить в партию
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                    <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                      {groupSheets.map((sheet) => {
                        const token = tokens.find(
                          (item) => item.sheetId === sheet.id,
                        );
                        const isActive = selectedSheet?.id === sheet.id;
                        return (
                          <button
                            key={sheet.id}
                            onClick={() =>
                              setSelectedTokenId(token?.id ?? selectedTokenId)
                            }
                            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left ${isActive ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/8 bg-slate-950/40"}`}
                          >
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-lg font-semibold text-white">
                              {sheet.avatarUrl ? (
                                <img
                                  src={sheet.avatarUrl}
                                  alt={sheet.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span>{getTokenInitial(sheet.name)}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-white">
                                {sheet.name}
                              </div>
                              <div className="truncate text-xs text-slate-400">
                                {sheet.race} • {sheet.heroClass} • ур.{" "}
                                {sheet.level}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                HP {sheet.hp}/{sheet.maxHp} • AC {sheet.ac} •{" "}
                                {token
                                  ? cellCoordinate(token.x, token.y)
                                  : "без токена"}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="min-w-0">
                      {selectedSheet ? (
                        <div className="min-w-0 space-y-4 text-sm text-slate-200">
                          <div className="grid gap-4 2xl:grid-cols-[180px_minmax(0,1fr)]">
                            <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
                              <div className="flex aspect-[4/5] items-center justify-center bg-slate-900 text-4xl font-semibold text-white">
                                {selectedSheet.avatarUrl ? (
                                  <img
                                    src={selectedSheet.avatarUrl}
                                    alt={selectedSheet.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {getTokenInitial(selectedSheet.name)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="min-w-0 space-y-3">
                              <input
                                value={selectedSheet.name}
                                disabled={!canEditSheet(selectedSheet)}
                                onChange={(event) =>
                                  handleSheetChange("name", event.target.value)
                                }
                                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                              />
                              <div className="grid gap-2 md:grid-cols-2">
                                <input
                                  value={selectedSheet.race}
                                  disabled={!canEditSheet(selectedSheet)}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "race",
                                      event.target.value,
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                                />
                                <input
                                  value={selectedSheet.heroClass}
                                  disabled={!canEditSheet(selectedSheet)}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "heroClass",
                                      event.target.value,
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                                />
                                <input
                                  value={selectedSheet.subclass ?? ""}
                                  disabled={!canEditSheet(selectedSheet)}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "subclass",
                                      event.target.value,
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                                  placeholder="Подкласс"
                                />
                                <input
                                  value={selectedSheet.background ?? ""}
                                  disabled={!canEditSheet(selectedSheet)}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "background",
                                      event.target.value,
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                                  placeholder="Предыстория"
                                />
                              </div>
                              <div className="grid gap-2 md:grid-cols-4">
                                <input
                                  type="number"
                                  disabled={!canEditSheet(selectedSheet)}
                                  value={selectedSheet.level}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "level",
                                      Number(event.target.value),
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60"
                                />
                                <input
                                  type="number"
                                  disabled={!canEditSheet(selectedSheet)}
                                  value={selectedSheet.hp}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "hp",
                                      Number(event.target.value),
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60"
                                />
                                <input
                                  type="number"
                                  disabled={!canEditSheet(selectedSheet)}
                                  value={selectedSheet.maxHp}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "maxHp",
                                      Number(event.target.value),
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60"
                                />
                                <input
                                  type="number"
                                  disabled={!canEditSheet(selectedSheet)}
                                  value={selectedSheet.ac}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "ac",
                                      Number(event.target.value),
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60"
                                />
                              </div>
                              <div className="grid gap-2 md:grid-cols-4">
                                <input
                                  type="number"
                                  disabled={!canEditSheet(selectedSheet)}
                                  value={selectedSheet.speed}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "speed",
                                      Number(event.target.value),
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60"
                                  placeholder="Скорость"
                                />
                                <input
                                  value={selectedSheet.alignment ?? ""}
                                  disabled={!canEditSheet(selectedSheet)}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "alignment",
                                      event.target.value,
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60"
                                  placeholder="Мировоззрение"
                                />
                                <input
                                  value={selectedSheet.playerName ?? ""}
                                  disabled={!canEditSheet(selectedSheet)}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "playerName",
                                      event.target.value,
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60"
                                  placeholder="Игрок"
                                />
                                <input
                                  type="number"
                                  value={selectedSheet.experience ?? 0}
                                  disabled={!canEditSheet(selectedSheet)}
                                  onChange={(event) =>
                                    handleSheetChange(
                                      "experience",
                                      Number(event.target.value),
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60"
                                  placeholder="XP"
                                />
                              </div>
                              {selectedProgression ? (
                                <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs uppercase tracking-wide text-slate-500">
                                      Campaign progression
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleProgressionModeChange("xp")
                                      }
                                      className={`rounded-full px-3 py-1 text-xs ${campaignConfig.progressionMode === "xp" ? "bg-cyan-500 text-slate-950" : "border border-white/10 text-slate-200"}`}
                                    >
                                      XP mode
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleProgressionModeChange("milestone")
                                      }
                                      className={`rounded-full px-3 py-1 text-xs ${campaignConfig.progressionMode === "milestone" ? "bg-fuchsia-500 text-white" : "border border-white/10 text-slate-200"}`}
                                    >
                                      Milestone mode
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleToggleMilestoneReady}
                                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200"
                                      disabled={
                                        campaignConfig.progressionMode !==
                                        "milestone"
                                      }
                                    >
                                      Открыть level up вручную
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddXp(300)}
                                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100"
                                      disabled={
                                        campaignConfig.progressionMode !== "xp"
                                      }
                                    >
                                      +300 XP
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddXp(1200)}
                                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100"
                                      disabled={
                                        campaignConfig.progressionMode !== "xp"
                                      }
                                    >
                                      +1200 XP
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleRollbackLastLevelUp}
                                      className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100 disabled:opacity-50"
                                      disabled={
                                        (
                                          levelRollbackSnapshots[
                                            selectedSheet.id
                                          ] ?? []
                                        ).length === 0
                                      }
                                    >
                                      Откатить level up
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      type="number"
                                      value={customXpInput}
                                      onChange={(event) =>
                                        setCustomXpInput(event.target.value)
                                      }
                                      className="w-40 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
                                      placeholder="XP delta"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleApplyCustomXp}
                                      className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100"
                                      disabled={
                                        campaignConfig.progressionMode !== "xp"
                                      }
                                    >
                                      Применить кастомный XP
                                    </button>
                                  </div>
                                  <CharacterXpCard
                                    progression={selectedProgression}
                                    mode={campaignConfig.progressionMode}
                                  />
                                  <LevelUpBanner
                                    progression={selectedProgression}
                                    onOpen={handleStartLevelUp}
                                  />
                                  {selectedProgressionOptions ? (
                                    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                                      <div className="rounded-2xl border border-white/8 px-3 py-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">
                                          Class features
                                        </div>
                                        <div className="mt-2 text-sm text-slate-200">
                                          {selectedProgressionOptions.continueClass.classFeatures
                                            .map((item) => item.name)
                                            .join(", ") ||
                                            "Нет новых особенностей"}
                                        </div>
                                      </div>
                                      <div className="rounded-2xl border border-white/8 px-3 py-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">
                                          Spells / ASI
                                        </div>
                                        <div className="mt-2 text-sm text-slate-200">
                                          {selectedProgressionOptions
                                            .continueClass.spells.length
                                            ? `Заклинаний: ${selectedProgressionOptions.continueClass.spells.length}`
                                            : "Новых заклинаний нет"}{" "}
                                          ·{" "}
                                          {selectedProgressionOptions
                                            .continueClass.asi.available
                                            ? "Есть окно ASI/feat"
                                            : "ASI нет"}
                                        </div>
                                      </div>
                                      <div className="rounded-2xl border border-white/8 px-3 py-3">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">
                                          Multiclass preview
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-200">
                                          {selectedProgressionOptions.multiclassOptions.filter(
                                            (item) => item.available,
                                          ).length ? (
                                            selectedProgressionOptions.multiclassOptions
                                              .filter((item) => item.available)
                                              .map((item) => {
                                                const classRef =
                                                  levelUpClasses.find(
                                                    (entry) =>
                                                      entry.id ===
                                                      item.item.classId,
                                                  );
                                                return classRef ? (
                                                  <a
                                                    key={item.item.classId}
                                                    href={classRef.href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-cyan-300 underline underline-offset-4"
                                                  >
                                                    {item.item.classId}
                                                  </a>
                                                ) : (
                                                  <span key={item.item.classId}>
                                                    {item.item.classId}
                                                  </span>
                                                );
                                              })
                                          ) : (
                                            <span>
                                              Нет доступных мультиклассов
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.9fr)]">
                            <div className="min-w-0">
                              <div className="mb-3 text-xs uppercase tracking-wide text-slate-500">
                                Характеристики и быстрые броски
                              </div>
                              <div className="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-3">
                                {statLabels.map((stat) => {
                                  const modifier = getAbilityModifier(
                                    selectedSheet.stats[stat.key],
                                  );
                                  return (
                                    <div
                                      key={stat.key}
                                      className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3 text-center"
                                    >
                                      <div className="text-xs uppercase tracking-wide text-slate-500">
                                        {stat.label}
                                      </div>
                                      <div className="mt-2 text-xl font-semibold text-white">
                                        {selectedSheet.stats[stat.key]}
                                      </div>
                                      <div className="mt-1 text-xs text-slate-400">
                                        mod {formatSignedModifier(modifier)}
                                      </div>
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickRoll(
                                              selectedSheet,
                                              `${stat.label} check`,
                                              `1d20${formatSignedModifier(modifier)}`,
                                            )
                                          }
                                          className="min-w-0 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-100"
                                        >
                                          Check
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickRoll(
                                              selectedSheet,
                                              `${stat.label} save`,
                                              `1d20${formatSignedModifier(modifier)}`,
                                            )
                                          }
                                          className="min-w-0 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-1 text-[11px] font-medium text-fuchsia-100"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="min-w-0 rounded-3xl border border-white/8 bg-slate-950/40 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Быстрые действия боя
                                </div>
                                <div className="text-xs text-slate-500">
                                  PB{" "}
                                  {formatSignedModifier(
                                    selectedSheet.proficiencyBonus ??
                                      Math.max(
                                        2,
                                        Math.ceil(selectedSheet.level / 4) + 1,
                                      ),
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickRoll(
                                      selectedSheet,
                                      "Initiative",
                                      `1d20${formatSignedModifier(selectedSheetInitiativeModifier)}`,
                                    )
                                  }
                                  className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-left text-sm text-amber-100"
                                  title="Бросить инициативу"
                                >
                                  <AdaptiveLabel
                                    full="Бросить инициативу"
                                    short="Инит."
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickRoll(
                                      selectedSheet,
                                      "Melee attack",
                                      `1d20${formatSignedModifier(getAbilityModifier(selectedSheet.stats.str) + (selectedSheet.proficiencyBonus ?? Math.max(2, Math.ceil(selectedSheet.level / 4) + 1)))}`,
                                    )
                                  }
                                  className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-left text-sm text-emerald-100"
                                  title="Атака оружием (СИЛ + PB)"
                                >
                                  <AdaptiveLabel
                                    full="Атака оружием (СИЛ + PB)"
                                    short="СИЛ+PB"
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickRoll(
                                      selectedSheet,
                                      "Ranged / finesse attack",
                                      `1d20${formatSignedModifier(getAbilityModifier(selectedSheet.stats.dex) + (selectedSheet.proficiencyBonus ?? Math.max(2, Math.ceil(selectedSheet.level / 4) + 1)))}`,
                                    )
                                  }
                                  className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-left text-sm text-sky-100"
                                  title="Атака оружием (ЛОВ + PB)"
                                >
                                  <AdaptiveLabel
                                    full="Атака оружием (ЛОВ + PB)"
                                    short="ЛОВ+PB"
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const spellAbility =
                                      getSpellcastingAbility(selectedSheet);
                                    const spellMod = getAbilityModifier(
                                      selectedSheet.stats[spellAbility],
                                    );
                                    handleQuickRoll(
                                      selectedSheet,
                                      `Spell attack (${String(spellAbility).toUpperCase()})`,
                                      `1d20${formatSignedModifier(spellMod + (selectedSheet.proficiencyBonus ?? Math.max(2, Math.ceil(selectedSheet.level / 4) + 1)))}`,
                                    );
                                  }}
                                  className="rounded-2xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-left text-sm text-violet-100"
                                  title="Заклинательная атака"
                                >
                                  <AdaptiveLabel
                                    full="Заклинательная атака"
                                    short="Spell"
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickRoll(
                                      selectedSheet,
                                      "Concentration",
                                      `1d20${formatSignedModifier(getAbilityModifier(selectedSheet.stats.con))}`,
                                    )
                                  }
                                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-left text-sm text-slate-200"
                                  title="Проверка концентрации"
                                >
                                  <AdaptiveLabel
                                    full="Проверка концентрации"
                                    short="Конц."
                                  />
                                </button>
                              </div>
                              <div className="mt-3 text-xs leading-5 text-slate-400">
                                Кнопки сразу бросают d20 по реальным
                                модификаторам, подставляют формулу в общий dice
                                roller и пишут результат в журнал.
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-white/8 bg-slate-950/40 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Ресурсы персонажа v1
                                </div>
                                <div className="mt-1 text-sm text-slate-300">
                                  Spell slots, hit dice, rage, ki, sorcery
                                  points, death saves и exhaustion сохраняются в
                                  JSON комнаты.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApplyRest("short")}
                                  disabled={!canEditSheet(selectedSheet)}
                                  className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 disabled:opacity-50"
                                >
                                  <AdaptiveLabel
                                    full="Short rest"
                                    short="S rest"
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyRest("long")}
                                  disabled={!canEditSheet(selectedSheet)}
                                  className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100 disabled:opacity-50"
                                >
                                  <AdaptiveLabel
                                    full="Long rest"
                                    short="L rest"
                                  />
                                </button>
                              </div>
                            </div>
                            {(() => {
                              const resources = selectedSheetResources;
                              return (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                                    {(resources.spellSlots ?? []).map(
                                      (slot, index) => (
                                        <div
                                          key={`slot-${index}`}
                                          className="rounded-2xl border border-white/8 bg-slate-900/60 px-3 py-3"
                                        >
                                          <div className="text-xs uppercase tracking-wide text-slate-500">
                                            Spell slot {index + 1}
                                          </div>
                                          <div className="mt-3 grid grid-cols-2 gap-2">
                                            <input
                                              type="number"
                                              min={0}
                                              value={slot.current}
                                              disabled={
                                                !canEditSheet(selectedSheet)
                                              }
                                              onChange={(event) =>
                                                handleSpellSlotLimitChange(
                                                  index,
                                                  "current",
                                                  Number(event.target.value),
                                                )
                                              }
                                              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white disabled:opacity-60"
                                              placeholder="Текущие"
                                            />
                                            <input
                                              type="number"
                                              min={0}
                                              value={slot.max}
                                              disabled={
                                                !canEditSheet(selectedSheet)
                                              }
                                              onChange={(event) =>
                                                handleSpellSlotLimitChange(
                                                  index,
                                                  "max",
                                                  Number(event.target.value),
                                                )
                                              }
                                              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white disabled:opacity-60"
                                              placeholder="Макс"
                                            />
                                          </div>
                                          <div className="mt-3 flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleAdjustSpellSlot(index, -1)
                                              }
                                              disabled={
                                                !canEditSheet(selectedSheet) ||
                                                slot.current <= 0
                                              }
                                              className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100 disabled:opacity-50"
                                            >
                                              Потратить
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleAdjustSpellSlot(index, 1)
                                              }
                                              disabled={
                                                !canEditSheet(selectedSheet) ||
                                                slot.current >= slot.max
                                              }
                                              className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100 disabled:opacity-50"
                                            >
                                              Вернуть
                                            </button>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                  <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                                    {(
                                      [
                                        ["hitDice", "Hit dice"],
                                        ["rage", "Rage"],
                                        ["ki", "Ki"],
                                        ["sorceryPoints", "Sorcery"],
                                      ] as const
                                    ).map(([key, label]) => {
                                      const track = resources[key];
                                      return (
                                        <div
                                          key={key}
                                          className="rounded-2xl border border-white/8 bg-slate-900/60 px-3 py-3"
                                        >
                                          <div className="text-xs uppercase tracking-wide text-slate-500">
                                            {label}
                                          </div>
                                          <div className="mt-3 grid grid-cols-2 gap-2">
                                            <input
                                              type="number"
                                              min={0}
                                              value={track?.current ?? 0}
                                              disabled={
                                                !canEditSheet(selectedSheet)
                                              }
                                              onChange={(event) =>
                                                handleResourceTrackLimitChange(
                                                  key,
                                                  "current",
                                                  Number(event.target.value),
                                                )
                                              }
                                              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white disabled:opacity-60"
                                              placeholder="Текущие"
                                            />
                                            <input
                                              type="number"
                                              min={0}
                                              value={track?.max ?? 0}
                                              disabled={
                                                !canEditSheet(selectedSheet)
                                              }
                                              onChange={(event) =>
                                                handleResourceTrackLimitChange(
                                                  key,
                                                  "max",
                                                  Number(event.target.value),
                                                )
                                              }
                                              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white disabled:opacity-60"
                                              placeholder="Макс"
                                            />
                                          </div>
                                          <div className="mt-3 flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleAdjustResourceTrack(
                                                  key,
                                                  -1,
                                                )
                                              }
                                              disabled={
                                                !canEditSheet(selectedSheet) ||
                                                (track?.current ?? 0) <= 0
                                              }
                                              className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100 disabled:opacity-50"
                                            >
                                              Потратить
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleAdjustResourceTrack(
                                                  key,
                                                  1,
                                                )
                                              }
                                              disabled={
                                                !canEditSheet(selectedSheet) ||
                                                (track?.current ?? 0) >=
                                                  (track?.max ?? 0)
                                              }
                                              className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100 disabled:opacity-50"
                                            >
                                              Вернуть
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                                    <div className="rounded-2xl border border-white/8 bg-slate-900/60 px-3 py-3">
                                      <div className="text-xs uppercase tracking-wide text-slate-500">
                                        Death saves
                                      </div>
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <input
                                          type="number"
                                          min={0}
                                          max={3}
                                          value={
                                            resources.deathSaves?.successes ?? 0
                                          }
                                          disabled={
                                            !canEditSheet(selectedSheet)
                                          }
                                          onChange={(event) =>
                                            handleDeathSaveChange(
                                              "successes",
                                              Number(event.target.value),
                                            )
                                          }
                                          className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white disabled:opacity-60"
                                          placeholder="Успехи"
                                        />
                                        <input
                                          type="number"
                                          min={0}
                                          max={3}
                                          value={
                                            resources.deathSaves?.failures ?? 0
                                          }
                                          disabled={
                                            !canEditSheet(selectedSheet)
                                          }
                                          onChange={(event) =>
                                            handleDeathSaveChange(
                                              "failures",
                                              Number(event.target.value),
                                            )
                                          }
                                          className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white disabled:opacity-60"
                                          placeholder="Провалы"
                                        />
                                      </div>
                                      <div className="mt-3 flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAdjustDeathSave(
                                              "successes",
                                              1,
                                            )
                                          }
                                          disabled={
                                            !canEditSheet(selectedSheet) ||
                                            (resources.deathSaves?.successes ??
                                              0) >= 3
                                          }
                                          className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100 disabled:opacity-50"
                                        >
                                          + успех
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAdjustDeathSave("failures", 1)
                                          }
                                          disabled={
                                            !canEditSheet(selectedSheet) ||
                                            (resources.deathSaves?.failures ??
                                              0) >= 3
                                          }
                                          className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100 disabled:opacity-50"
                                        >
                                          + провал
                                        </button>
                                      </div>
                                    </div>
                                    <div className="rounded-2xl border border-white/8 bg-slate-900/60 px-3 py-3">
                                      <div className="text-xs uppercase tracking-wide text-slate-500">
                                        Exhaustion
                                      </div>
                                      <input
                                        type="number"
                                        min={0}
                                        max={6}
                                        value={resources.exhaustion ?? 0}
                                        disabled={!canEditSheet(selectedSheet)}
                                        onChange={(event) =>
                                          handleExhaustionChange(
                                            Number(event.target.value),
                                          )
                                        }
                                        className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white disabled:opacity-60"
                                      />
                                      <div className="mt-3 flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAdjustExhaustion(-1)
                                          }
                                          disabled={
                                            !canEditSheet(selectedSheet) ||
                                            (resources.exhaustion ?? 0) <= 0
                                          }
                                          className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100 disabled:opacity-50"
                                        >
                                          Снизить
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAdjustExhaustion(1)
                                          }
                                          disabled={
                                            !canEditSheet(selectedSheet) ||
                                            (resources.exhaustion ?? 0) >= 6
                                          }
                                          className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100 disabled:opacity-50"
                                        >
                                          Повысить
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="grid gap-2 md:grid-cols-3">
                            <input
                              value={selectedSheet.age ?? ""}
                              disabled={!canEditSheet(selectedSheet)}
                              onChange={(event) =>
                                handleSheetChange("age", event.target.value)
                              }
                              className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                              placeholder="Возраст"
                            />
                            <input
                              value={selectedSheet.height ?? ""}
                              disabled={!canEditSheet(selectedSheet)}
                              onChange={(event) =>
                                handleSheetChange("height", event.target.value)
                              }
                              className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                              placeholder="Рост"
                            />
                            <input
                              value={selectedSheet.weight ?? ""}
                              disabled={!canEditSheet(selectedSheet)}
                              onChange={(event) =>
                                handleSheetChange("weight", event.target.value)
                              }
                              className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                              placeholder="Вес"
                            />
                            <input
                              value={selectedSheet.eyes ?? ""}
                              disabled={!canEditSheet(selectedSheet)}
                              onChange={(event) =>
                                handleSheetChange("eyes", event.target.value)
                              }
                              className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                              placeholder="Глаза"
                            />
                            <input
                              value={selectedSheet.skin ?? ""}
                              disabled={!canEditSheet(selectedSheet)}
                              onChange={(event) =>
                                handleSheetChange("skin", event.target.value)
                              }
                              className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                              placeholder="Кожа"
                            />
                            <input
                              value={selectedSheet.hair ?? ""}
                              disabled={!canEditSheet(selectedSheet)}
                              onChange={(event) =>
                                handleSheetChange("hair", event.target.value)
                              }
                              className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60"
                              placeholder="Волосы"
                            />
                          </div>

                          <div className="grid gap-3 2xl:grid-cols-2">
                            {characterSections(selectedSheet).map((section) => (
                              <div
                                key={section.title}
                                className="overflow-hidden rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-4"
                              >
                                <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                                  {section.title}
                                </div>
                                <div className="break-words whitespace-pre-wrap text-slate-200">
                                  {section.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-slate-300">
                          Выберите персонажа слева.
                        </div>
                      )}
                    </div>
                  </div>
                </CompactSection>
                </div>
              </div>

              <div
                onDragOver={(event) =>
                  role === "gm" &&
                  handleDragOverMasterPanel("initiative", event)
                }
                onDrop={(event) =>
                  role === "gm" && handleDropMasterPanel("initiative", event)
                }
                onDragEnd={() => {
                  setDraggedMasterPanel(null);
                  setDragOverMasterPanel(null);
                }}
                style={
                  role === "gm"
                    ? {
                        order: gmPanelOrder.indexOf("initiative"),
                        gridColumn: `span ${getMasterPanelGridSpan("initiative", gmPanelSizes.initiative)} / span ${getMasterPanelGridSpan("initiative", gmPanelSizes.initiative)}`,
                      }
                    : undefined
                }
                className={`space-y-2 rounded-3xl ${draggedMasterPanel === "initiative" ? "ring-2 ring-cyan-400/50" : ""} ${dragOverMasterPanel === "initiative" ? "ring-2 ring-fuchsia-400/60" : ""} ${!panelVisibility.initiative || !masterPanelSearchMap.initiative ? "hidden" : ""}`}
              >
                {role === "gm" ? (
                  <div
                    draggable
                    onDragStart={(event) =>
                      handleDragStartMasterPanel("initiative", event)
                    }
                    className="flex min-w-0 cursor-grab flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-slate-950/40 px-3 py-2 text-xs text-slate-300 active:cursor-grabbing"
                  >
                    <span className="font-medium text-white">
                      Панель мастера:{" "}
                      <AdaptiveLabel
                        full="Бой: инициатива"
                        short={masterPanelShortLabels.initiative}
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMoveGmPanel("initiative", "up")}
                      disabled={gmPanelOrder.indexOf("initiative") === 0}
                      className="rounded-full border border-white/10 px-2 py-1 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveGmPanel("initiative", "down")}
                      disabled={
                        gmPanelOrder.indexOf("initiative") ===
                        gmPanelOrder.length - 1
                      }
                      className="rounded-full border border-white/10 px-2 py-1 disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <span className="text-slate-500">Размер</span>
                    <input
                      type="range"
                      min={0}
                      max={getMasterPanelDefinition("initiative").allowedSizes.length - 1}
                      step={1}
                      value={Math.max(0, getMasterPanelDefinition("initiative").allowedSizes.indexOf(gmPanelSizes.initiative))}
                      onChange={(event) =>
                        handleGmPanelWidthChange(
                          "initiative",
                          Number(event.target.value),
                        )
                      }
                    />
                  </div>
                ) : null}
                <CompactSection
                  title="Бой · Инициатива и ход"
                  description="Боевой трекер поверх текущих токенов с сохранением в JSON комнаты."
                  badge="бой"
                >
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    {role === "gm" ? (
                      <>
                        <button
                          onClick={() => handleStartInitiative("visible")}
                          className="rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950"
                        >
                          Прокинуть инициативу всем, кто виден врагам
                        </button>
                        <button
                          onClick={() => handleStartInitiative("all")}
                          className="rounded-full border border-white/10 px-4 py-2 text-slate-200"
                        >
                          Прокинуть за всех
                        </button>
                        <button
                          onClick={handleAdvanceTurn}
                          disabled={
                            !initiative.active ||
                            initiative.participants.length === 0
                          }
                          className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 font-medium text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Следующий ход
                        </button>
                        <button
                          onClick={handleStopInitiative}
                          disabled={
                            initiative.participants.length === 0 &&
                            !initiative.active
                          }
                          className="rounded-full border border-white/10 px-4 py-2 text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Сбросить
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Статус
                      </div>
                      <div className="mt-2 text-white">
                        {initiative.active ? "Бой активен" : "Ожидает запуска"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Раунд
                      </div>
                      <div className="mt-2 text-white">
                        {initiative.active ? initiative.round : "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Текущий ход
                      </div>
                      <div className="mt-2 text-white">
                        {activeInitiativeParticipant
                          ? activeInitiativeParticipant.name
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Порядок ходов
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          Отдельное поле с портретами персонажей и НПС. Мастер
                          может руками переставлять участников вверх/вниз.
                        </div>
                      </div>
                      <span className="badge">очерёдность ходов</span>
                    </div>

                    {initiativeParticipantsForView.length ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {initiativeParticipantsForView.map(
                          (participant, index) => {
                            const isActive =
                              activeInitiativeParticipant?.tokenId ===
                              participant.tokenId;
                            const avatarUrl = initiativePortraits.get(
                              participant.tokenId,
                            );
                            return (
                              <div
                                key={`order-${participant.tokenId}`}
                                className={`rounded-2xl border p-3 ${isActive ? "border-amber-400/40 bg-amber-500/10" : "border-white/8 bg-slate-900/40"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() =>
                                      handleSelectTurn(participant.tokenId)
                                    }
                                    disabled={role !== "gm"}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                                  >
                                    <div
                                      className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 text-lg font-semibold text-white"
                                      style={{
                                        backgroundColor: `${participant.color}33`,
                                        borderColor: participant.color,
                                      }}
                                    >
                                      {avatarUrl ? (
                                        <img
                                          src={avatarUrl}
                                          alt={participant.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span>
                                          {getTokenInitial(participant.name)}
                                        </span>
                                      )}
                                      <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-[11px] font-semibold text-white">
                                        {index + 1}
                                      </span>
                                    </div>
                                    <span className="min-w-0">
                                      <span className="block truncate font-medium text-white">
                                        {participant.name}
                                      </span>
                                      <span className="block text-xs text-slate-400">
                                        {participant.kind}
                                        {participant.hiddenFromPlayers
                                          ? " • скрыт от игроков"
                                          : ""}
                                      </span>
                                      <span className="mt-1 block text-sm text-slate-200">
                                        Инициатива {participant.initiative} · мод.{" "}
                                        {formatSignedModifier(
                                          participant.initiativeModifier,
                                        )}
                                      </span>
                                    </span>
                                  </button>
                                  {role === "gm" ? (
                                    <div className="flex flex-col gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleMoveInitiativeParticipant(
                                            participant.tokenId,
                                            "up",
                                          )
                                        }
                                        disabled={index === 0}
                                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 disabled:opacity-40"
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleMoveInitiativeParticipant(
                                            participant.tokenId,
                                            "down",
                                          )
                                        }
                                        disabled={
                                          index ===
                                          initiativeParticipantsForView.length -
                                            1
                                        }
                                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 disabled:opacity-40"
                                      >
                                        ↓
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                        Запустите инициативу, чтобы увидеть порядок ходов
                        отдельным полем с портретами.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {initiativeParticipantsForView.length ? (
                      initiativeParticipantsForView.map(
                        (participant, index) => {
                          const isActive =
                            activeInitiativeParticipant?.tokenId ===
                            participant.tokenId;
                          return (
                            <div
                              key={participant.tokenId}
                              className={`rounded-2xl border px-4 py-3 ${isActive ? "border-amber-400/40 bg-amber-500/10" : "border-white/8 bg-slate-950/30"}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <button
                                  onClick={() =>
                                    handleSelectTurn(participant.tokenId)
                                  }
                                  disabled={role !== "gm"}
                                  className="flex min-w-0 items-center gap-3 text-left disabled:cursor-default"
                                >
                                  <span
                                    className="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold text-white"
                                    style={{
                                      borderColor: participant.color,
                                      backgroundColor: `${participant.color}33`,
                                    }}
                                  >
                                    {index + 1}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate font-medium text-white">
                                      {participant.name}
                                    </span>
                                    <span className="block text-xs text-slate-400">
                                      {participant.kind}
                                      {participant.hiddenFromPlayers
                                        ? " • скрыт от игроков"
                                        : ""}
                                    </span>
                                  </span>
                                </button>
                                <div className="flex items-center gap-2">
                                  {role === "gm" ? (
                                    <input
                                      type="number"
                                      value={participant.initiative}
                                      onChange={(event) =>
                                        updateInitiativeParticipant(
                                          participant.tokenId,
                                          (current) => ({
                                            ...current,
                                            initiative:
                                              Number(event.target.value) || 0,
                                          }),
                                        )
                                      }
                                      className="w-20 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-right text-white"
                                    />
                                  ) : (
                                    <div className="text-lg font-semibold text-white">
                                      {participant.initiative}
                                    </div>
                                  )}
                                  <span className="text-xs text-slate-500">
                                    мод.{" "}
                                    {formatSignedModifier(
                                      participant.initiativeModifier,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                        Запустите автоинициативу, чтобы получить порядок ходов,
                        следующий ход и сохранение состояния между сценами и
                        JSON-экспортом.
                      </div>
                    )}
                  </div>
                </CompactSection>
              </div>

              {role === "gm" ? (
                <div
                  onDragOver={(event) =>
                    handleDragOverMasterPanel("tools", event)
                  }
                  onDrop={(event) => handleDropMasterPanel("tools", event)}
                  onDragEnd={() => {
                    setDraggedMasterPanel(null);
                    setDragOverMasterPanel(null);
                  }}
                  style={{
                    order: gmPanelOrder.indexOf("tools"),
                    gridColumn: `span ${getMasterPanelGridSpan("tools", gmPanelSizes.tools)} / span ${getMasterPanelGridSpan("tools", gmPanelSizes.tools)}`,
                  }}
                  className={`space-y-2 rounded-3xl ${draggedMasterPanel === "tools" ? "ring-2 ring-cyan-400/50" : ""} ${dragOverMasterPanel === "tools" ? "ring-2 ring-fuchsia-400/60" : ""} ${!panelVisibility.tools || !masterPanelSearchMap.tools ? "hidden" : ""}`}
                >
                  <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)]">
                    <div className="space-y-2">
                      <div
                        draggable
                        onDragStart={(event) =>
                          handleDragStartMasterPanel("tools", event)
                        }
                        className="flex min-w-0 cursor-grab flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-slate-950/40 px-3 py-2 text-xs text-slate-300 active:cursor-grabbing"
                      >
                        <span className="font-medium text-white">
                          Панель мастера:{" "}
                          <AdaptiveLabel
                            full="Нарратив: инструменты"
                            short={masterPanelShortLabels.tools}
                          />
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMoveGmPanel("tools", "up")}
                          disabled={gmPanelOrder.indexOf("tools") === 0}
                          className="rounded-full border border-white/10 px-2 py-1 disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveGmPanel("tools", "down")}
                          disabled={
                            gmPanelOrder.indexOf("tools") ===
                            gmPanelOrder.length - 1
                          }
                          className="rounded-full border border-white/10 px-2 py-1 disabled:opacity-40"
                        >
                          ↓
                        </button>
                        <span className="text-slate-500">Размер</span>
                        <input
                          type="range"
                          min={0}
                          max={getMasterPanelDefinition("tools").allowedSizes.length - 1}
                          step={1}
                          value={Math.max(0, getMasterPanelDefinition("tools").allowedSizes.indexOf(gmPanelSizes.tools))}
                          onChange={(event) =>
                            handleGmPanelWidthChange(
                              "tools",
                              Number(event.target.value),
                            )
                          }
                        />
                      </div>
                      <CompactSection
                        title="Нарратив · Инструменты мастера"
                        description="Лут, события, заметки и генераторы для ведения сцены."
                        badge="по таблицам dnd.su"
                      >
                        <div className="mt-4 space-y-3 text-sm text-slate-300">
                          <div className="overflow-hidden rounded-2xl border border-white/8 px-4 py-3">
                            <div className="font-medium text-white">
                              Последний лут
                            </div>
                            <div className="mt-1">{lootResult.name}</div>
                            <div className="mt-1 text-slate-400">
                              {lootResult.details}
                            </div>
                            {lootResult.rolledMagicItems?.length ? (
                              <div className="mt-3 space-y-2">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                  Выпавшие магические предметы
                                </div>
                                {lootResult.rolledMagicItems.map(
                                  (item, index) => (
                                    <a
                                      key={`${item.table}-${item.roll}-${index}-${item.name}`}
                                      className="block text-cyan-300 underline underline-offset-4"
                                      href={item.link}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Таблица {item.table}, бросок{" "}
                                      {String(item.roll).padStart(2, "0")}:{" "}
                                      {item.name}
                                    </a>
                                  ),
                                )}
                              </div>
                            ) : null}
                            <a
                              className="mt-2 inline-flex break-all text-cyan-300 underline"
                              href={lootResult.link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {lootResult.link}
                            </a>
                          </div>
                          <label className="block rounded-2xl border border-white/8 px-4 py-3">
                            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                              Таблица сокровищ dnd.su
                            </div>
                            <select
                              value={lootCrBand}
                              onChange={(event) =>
                                setLootCrBand(event.target.value as LootCrBand)
                              }
                              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white"
                            >
                              <option value="0-4">
                                Показатель опасности 0–4
                              </option>
                              <option value="5-10">
                                Показатель опасности 5–10
                              </option>
                              <option value="11-16">
                                Показатель опасности 11–16
                              </option>
                              <option value="17+">
                                Показатель опасности 17+
                              </option>
                            </select>
                          </label>
                          <button
                            onClick={handleRandomLoot}
                            className="w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950"
                          >
                            Сгенерировать лут из таблицы
                          </button>
                          <div className="overflow-hidden rounded-2xl border border-white/8 px-4 py-3">
                            <div className="font-medium text-white">
                              Последнее событие
                            </div>
                            <div className="mt-1">{eventResult.title}</div>
                            <div className="mt-1 text-slate-400">
                              {eventResult.description}
                            </div>
                            <a
                              className="mt-2 inline-flex break-all text-cyan-300 underline"
                              href={eventResult.link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {eventResult.link}
                            </a>
                          </div>
                          <button
                            onClick={handleRandomEvent}
                            className="w-full rounded-full bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white"
                          >
                            Случайное событие
                          </button>

                          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium text-white">
                                  Быстро добавить НПС на карту
                                </div>
                                <div className="mt-1 text-sm text-slate-400">
                                  Мастер задаёт параметры и сразу получает новый
                                  токен на публичной или скрытой карте.
                                </div>
                              </div>
                              <span className="badge">НПС</span>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <input
                                value={npcNameInput}
                                onChange={(event) =>
                                  setNpcNameInput(event.target.value)
                                }
                                placeholder="Имя НПС"
                                className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                              />
                              <select
                                value={npcKindInput}
                                onChange={(event) =>
                                  setNpcKindInput(
                                    event.target.value as TokenKind,
                                  )
                                }
                                className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                              >
                                <option value="npc">НПС</option>
                                <option value="monster">Монстр</option>
                                <option value="object">Объект</option>
                              </select>
                              <input
                                value={npcHpInput}
                                onChange={(event) =>
                                  setNpcHpInput(event.target.value)
                                }
                                placeholder="HP"
                                className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                              />
                              <input
                                value={npcAcInput}
                                onChange={(event) =>
                                  setNpcAcInput(event.target.value)
                                }
                                placeholder="AC"
                                className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                              />
                              <input
                                value={npcSpeedInput}
                                onChange={(event) =>
                                  setNpcSpeedInput(event.target.value)
                                }
                                placeholder="Speed"
                                className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                              />
                              <select
                                value={npcPlacementBoard}
                                onChange={(event) =>
                                  setNpcPlacementBoard(
                                    event.target.value as BoardKind,
                                  )
                                }
                                className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                              >
                                <option value="gm">
                                  Скрытая карта мастера
                                </option>
                                <option value="public">Публичная карта</option>
                              </select>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                              <label className="flex-1 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
                                Цвет токена
                                <input
                                  type="color"
                                  value={hexFromColorString(npcColorInput)}
                                  onChange={(event) =>
                                    setNpcColorInput(event.target.value)
                                  }
                                  className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-transparent"
                                />
                              </label>
                              <button
                                onClick={handleAddNpcToMap}
                                className="rounded-full bg-amber-400 px-5 py-3 text-sm font-medium text-slate-950"
                              >
                                Добавить на карту
                              </button>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium text-white">
                                  Таблица слухов города
                                </div>
                                <div className="mt-1 text-sm text-slate-400">
                                  Введите запрос как для мастера, и блок вернёт
                                  5 готовых слухов в городском стиле.
                                </div>
                              </div>
                              <span className="badge">5 rumors</span>
                            </div>
                            <textarea
                              value={rumorPromptInput}
                              onChange={(event) =>
                                setRumorPromptInput(event.target.value)
                              }
                              rows={3}
                              placeholder="Например: культ под рынком, пропавший магистр и тревога в порту"
                              className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
                            />
                            <button
                              onClick={handleGenerateRumors}
                              className="mt-3 rounded-full bg-cyan-500 px-5 py-3 text-sm font-medium text-slate-950"
                            >
                              Сгенерировать 5 слухов
                            </button>
                            <div className="mt-4 space-y-2">
                              {rumorResults.length ? (
                                rumorResults.map((rumor, index) => (
                                  <div
                                    key={`${index}-${rumor}`}
                                    className="rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3 text-sm leading-6 text-slate-200"
                                  >
                                    <span className="mr-2 font-semibold text-cyan-300">
                                      {index + 1}.
                                    </span>
                                    {rumor}
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">
                                  Пока пусто. Введите тему города, фракцию,
                                  кризис или загадку — и получите 5 слухов.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CompactSection>
                    </div>

                    <CompactSection
                      title="Быстрые действия"
                      description="Чат и кубы собраны в один компактный вертикальный стек."
                      badge="утилиты"
                      defaultOpen
                      className="h-fit"
                    >
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                          <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
                            <h2 className="text-lg font-semibold text-white">
                              Чат / заметка
                            </h2>
                            <span className="truncate text-xs text-slate-400 sm:text-sm">
                              локально в журнал
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap">
                            <input
                              value={chatInput}
                              onChange={(event) =>
                                setChatInput(event.target.value)
                              }
                              placeholder="Например: Борин идёт к двери"
                              className="min-w-0 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                            />
                            <button
                              onClick={handleSendChat}
                              className="min-h-10 min-w-[6rem] rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white"
                            >
                              <span className="sm:hidden">↗ Отпр.</span>
                              <span className="hidden sm:inline">Отправить</span>
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                          <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
                            <h2 className="text-lg font-semibold text-white">
                              Кубы
                            </h2>
                            <span className="truncate text-xs text-slate-400 sm:text-sm">
                              NdM±K
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap">
                            <input
                              value={diceFormula}
                              onChange={(event) =>
                                setDiceFormula(event.target.value)
                              }
                              className="min-w-0 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
                            />
                            <button
                              onClick={handleRoll}
                              className="min-h-10 min-w-[6rem] rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-slate-950"
                            >
                              <span className="sm:hidden">🎲 d20</span>
                              <span className="hidden sm:inline">Roll</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </CompactSection>
                  </div>

                  <CompactSection
                    title="Журнал действий"
                    description="Лента событий осталась полностью доступной, но больше не отвлекает постоянно."
                    badge="последние 20 событий"
                  >
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(
                        [
                          ["all", "Все"],
                          ["system", "Система"],
                          ["map", "Карта"],
                          ["dice", "Броски"],
                          ["loot", "Лут"],
                          ["event", "События"],
                          ["initiative", "Инициатива"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setJournalFilter(value)}
                          className={boardButtonClass(journalFilter === value)}
                        >
                          {label}
                        </button>
                      ))}
                      <input
                        value={journalSearch}
                        onChange={(event) => setJournalSearch(event.target.value)}
                        placeholder="Поиск по журналу"
                        className="min-w-0 max-w-full flex-1 rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 text-sm">
                      {filteredJournal.map((entry) => (
                        <div
                          key={entry.id}
                          className="overflow-hidden rounded-2xl border border-white/8 px-4 py-3"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{entry.type}</span>
                            <span>{entry.time}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 break-words whitespace-pre-wrap text-slate-200 sm:line-clamp-none">
                            {entry.text}
                          </p>
                        </div>
                      ))}
                      {!filteredJournal.length ? (
                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-slate-400">
                          Ничего не найдено по текущему фильтру.
                        </div>
                      ) : null}
                    </div>
                  </CompactSection>

                  <CompactSection
                    title="Виджет местности"
                    description="Региональная карта вынесена в отдельный раскрывающийся блок."
                    badge="региональная карта"
                  >
                    <p className="mt-3 text-sm text-slate-300">
                      Сюда можно подставить внешний URL с региональной картой.
                      Для удобства я сразу поставил Waterdeep с tychmaps.com.
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      <input
                        value={widgetUrl}
                        onChange={(event) => setWidgetUrl(event.target.value)}
                        placeholder="https://tychmaps.com/waterdeep/"
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                      />
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
                        <iframe
                          title="Внешняя региональная карта"
                          src={widgetUrl}
                          className="h-[320px] w-full"
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      Если конкретный сайт запрещает открытие внутри iframe,
                      карта не покажется внутри виджета — в таком случае
                      откройте её отдельно:{" "}
                      <a
                        href={widgetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-300 underline underline-offset-4"
                      >
                        открыть карту в новой вкладке
                      </a>
                      .
                    </div>
                  </CompactSection>
                </div>
              ) : null}
            </div>
          </div>
          <div className="card sticky top-3 z-10 flex flex-wrap items-center gap-2 px-4 py-3 text-sm text-slate-200">
            <span className="badge">Инструмент: {tool}</span>
            <span className="badge">
              Редактируется:{" "}
              {activeBoard === "public" ? "публичная карта" : "скрытая карта"}
            </span>
            <span className="badge">
              Видимость игроков:{" "}
              {playerTokens
                .map((token) => `${token.name} ${token.visionRadius ?? 3}`)
                .join(" • ") || "нет"}
            </span>
            <span className="badge">
              Fog: {useFogOfWar ? "вкл" : "выкл"} • Режим карты:{" "}
              {useSharedGmMapForPlayers ? "как у мастера" : "отдельная"}
            </span>
          </div>

          {role === "gm" ? (
            <div className="space-y-4">
              <div className="card flex min-w-0 flex-wrap items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={handleReturnToMainMap}
                  className={boardButtonClass(activeSavedMapId === null)}
                >
                  Основная
                </button>
                {savedMaps.map((preset) => (
                  <button
                    key={`map-tab-${preset.id}`}
                    type="button"
                    onClick={() => handleLoadSavedMap(preset)}
                    className={boardButtonClass(activeSavedMapId === preset.id)}
                  >
                    {preset.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleSetCurrentAsMainMap}
                  className="ml-auto rounded-full border border-emerald-400/40 px-3 py-2 text-xs text-emerald-200"
                >
                  Сделать текущую основной
                </button>
                <input
                  value={quickMapTabName}
                  onChange={(event) => setQuickMapTabName(event.target.value)}
                  placeholder="Новая вкладка"
                  className="min-w-0 max-w-full rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white"
                />
                <label className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={quickTabAsToken}
                    onChange={(event) => setQuickTabAsToken(event.target.checked)}
                  />
                  как токен-переход
                </label>
                <button
                  type="button"
                  onClick={handleQuickCreateMapTab}
                  className="rounded-full border border-cyan-400/40 px-3 py-2 text-xs text-cyan-200"
                >
                  + вкладка
                </button>
              </div>
              <div className="card flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                <span className="text-slate-400">Игроки по картам:</span>
                {tokens
                  .filter((token) => token.kind === "player")
                  .map((token) => (
                    <button
                      key={`player-jump-${token.id}`}
                      type="button"
                      onClick={() => handleFocusPlayerToken(token.id)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-slate-200"
                    >
                      {token.name} → {(token.mapId ?? "main") === "main"
                        ? "Основная"
                        : (savedMaps.find((preset) => preset.id === token.mapId)
                            ?.name ?? "Сцена")}
                    </button>
                  ))}
              </div>
              <div id="battle-board-public">
                <Board
                  boardId="battle-grid-public"
                  title="Публичная карта"
                  subtitle="Превью того, что увидят игроки: туман войны, радиус обзора и скрытность."
                  cols={cols}
                  rows={rows}
                  tiles={playerTiles}
                  tokens={visibleTokensForPlayers}
                  visibleMask={playerVisibilityMask}
                  zoom={zoom}
                  showZoomOverlay
                  onZoomOut={handleZoomOut}
                  onZoomIn={handleZoomIn}
                  onZoomChange={setZoom}
                  onZoomFit={handleZoomFit}
                  onReturnToMain={handleReturnToMainMap}
                  showReturnToMain={activeSavedMapId !== null}
                  onBoardPointerDown={handleBoardPointerDown("public")}
                  onTokenPointerDown={handleTokenPointerDown}
                  activeTokenId={activeInitiativeParticipant?.tokenId}
                />
              </div>
              <div id="battle-board-gm">
                <Board
                  boardId="battle-grid-gm"
                  title="Скрытая карта мастера"
                  subtitle="Здесь мастер держит НПС, ловушки, тайники и будущие сцены до их открытия игрокам."
                  cols={cols}
                  rows={rows}
                  tiles={mapState.gmTiles}
                  tokens={tokensOnCurrentMap}
                  zoom={zoom}
                  showZoomOverlay
                  onZoomOut={handleZoomOut}
                  onZoomIn={handleZoomIn}
                  onZoomChange={setZoom}
                  onZoomFit={handleZoomFit}
                  onReturnToMain={handleReturnToMainMap}
                  showReturnToMain={activeSavedMapId !== null}
                  onBoardPointerDown={handleBoardPointerDown("gm")}
                  onTokenPointerDown={handleTokenPointerDown}
                  activeTokenId={activeInitiativeParticipant?.tokenId}
                />
              </div>
            </div>
          ) : (
            <div id="battle-board-public">
              <Board
                boardId="battle-grid-public"
                title="Игровое поле"
                subtitle="Игрок видит карту с учётом fog of war, обзора и скрытых токенов."
                cols={cols}
                rows={rows}
                tiles={playerTiles}
                tokens={visibleTokensForPlayers}
                visibleMask={playerVisibilityMask}
                zoom={zoom}
                showZoomOverlay
                onZoomOut={handleZoomOut}
                onZoomIn={handleZoomIn}
                onZoomChange={setZoom}
                onZoomFit={handleZoomFit}
                onReturnToMain={handleReturnToMainMap}
                showReturnToMain={activeSavedMapId !== null}
                onBoardPointerDown={handleBoardPointerDown("public")}
                onTokenPointerDown={handleTokenPointerDown}
                activeTokenId={activeInitiativeParticipant?.tokenId}
              />
            </div>
          )}
        </section>
        {role === "gm" ? (
          <>
            <MasterSideDrawer
              open={isCreaturesDrawerOpen}
              activeTab={creaturesDrawerTab}
              width={creaturesDrawerWidth}
              onOpenChange={setIsCreaturesDrawerOpen}
              onTabChange={setCreaturesDrawerTab}
              onWidthChange={setCreaturesDrawerWidth}
            />
            <aside
              className={`master-side-drawer fixed inset-y-0 right-0 h-dvh max-h-dvh overflow-y-auto p-4 pt-28 ${isCreaturesDrawerOpen && creaturesDrawerTab === "tokens" ? "translate-x-0" : "translate-x-full pointer-events-none"}`}
              style={{ ["--drawer-width" as string]: `${creaturesDrawerWidth}px` }}
              aria-hidden={!isCreaturesDrawerOpen || creaturesDrawerTab !== "tokens"}
            >
              <CompactSection
                title="Токены"
                description="Полный список токенов со статусами и обзором игроков."
                badge={`${tokens.length} шт.`}
                defaultOpen
              >
                <div className="mt-4 max-h-[calc(100dvh-14rem)] space-y-3 overflow-y-auto pr-1 text-sm">
                  {tokens.map((token) => (
                    <div
                      key={token.id}
                      className={`overflow-hidden rounded-2xl border px-3 py-3 ${selectedTokenId === token.id ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/8"}`}
                    >
                      <button
                        onClick={() => setSelectedTokenId(token.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">
                              {token.name}
                            </div>
                            <div className="truncate text-slate-400">
                              {token.kind} • {cellCoordinate(token.x, token.y)}
                            </div>
                          </div>
                          <span className="max-w-[7rem] truncate text-right text-xs text-slate-300 sm:max-w-none">
                            HP {token.hp}/{token.maxHp}
                          </span>
                        </div>
                      </button>
                      <div className="mt-3 grid gap-2 text-xs text-slate-300">
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
                          <span>Скрыт от игроков</span>
                          <input
                            type="checkbox"
                            checked={Boolean(token.gmOnly)}
                            onChange={(event) =>
                              handleTokenSetting(
                                token.id,
                                "gmOnly",
                                event.target.checked,
                              )
                            }
                          />
                        </label>
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
                          <span>В скрытности (не виден)</span>
                          <input
                            type="checkbox"
                            checked={Boolean(token.hiddenFromPlayers)}
                            onChange={(event) =>
                              handleTokenSetting(
                                token.id,
                                "hiddenFromPlayers",
                                event.target.checked,
                              )
                            }
                          />
                        </label>
                        <label className="rounded-xl border border-white/10 px-3 py-2">
                          <div className="mb-1">Токен-переход по карте</div>
                          <select
                            value={token.linkedMapId ?? ""}
                            onChange={(event) =>
                              handleTokenMapLinkChange(token.id, event.target.value)
                            }
                            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-xs text-white"
                          >
                            <option value="">нет</option>
                            <option value="main">Основная карта</option>
                            {savedMaps.map((preset) => (
                              <option
                                key={`token-link-${token.id}-${preset.id}`}
                                value={preset.id}
                              >
                                {preset.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {token.kind === "player" ? (
                          <label className="rounded-xl border border-white/10 px-3 py-2">
                            <div className="mb-2">
                              Обзор игрока: {token.visionRadius ?? 3} клетки
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="8"
                              value={token.visionRadius ?? 3}
                              onChange={(event) =>
                                handleTokenSetting(
                                  token.id,
                                  "visionRadius",
                                  Number(event.target.value),
                                )
                              }
                              className="w-full"
                            />
                          </label>
                        ) : null}
                        {token.kind !== "object" ? (
                          <div className="rounded-xl border border-white/10 px-3 py-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span>Статусы и эффекты</span>
                              <span className="text-[11px] text-slate-500">
                                {(token.statuses ?? []).length
                                  ? `${(token.statuses ?? []).length} active`
                                  : "нет активных"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {tokenStatusCatalog.map((status) => {
                                const isActive = (token.statuses ?? []).includes(
                                  status.key,
                                );
                                return (
                                  <button
                                    key={`${token.id}-${status.key}`}
                                    type="button"
                                    onClick={() =>
                                      handleToggleTokenStatus(token.id, status.key)
                                    }
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${isActive ? status.colorClass : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"}`}
                                    title={status.description}
                                  >
                                    {status.short}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CompactSection>
            </aside>
          </>
        ) : null}
      </div>
      <MasterLayoutEditor
        open={isLayoutEditorOpen}
        layoutConfig={gmLayoutConfig}
        onClose={() => setIsLayoutEditorOpen(false)}
        onMovePanel={handleMoveGmPanel}
        onSetPanelSize={handleSetLayoutPanelSize}
      />
      <LevelUpDrawer
        open={isLevelUpOpen}
        draft={selectedLevelUpDraft}
        preview={selectedLevelUpPreview}
        onClose={() => setIsLevelUpOpen(false)}
        onChange={handlePatchLevelUpDraft}
        onConfirm={handleConfirmLevelUp}
      />
      <div className="pointer-events-none fixed right-4 top-4 z-[70] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-2 text-sm text-white shadow-lg ${
              toast.tone === "success"
                ? "border-emerald-400/40 bg-emerald-500/20"
                : toast.tone === "warning"
                  ? "border-amber-400/40 bg-amber-500/20"
                  : "border-cyan-400/40 bg-cyan-500/20"
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}
