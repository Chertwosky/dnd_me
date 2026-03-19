'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';

type RoomRole = 'gm' | 'player';
type JoinStep = 'auth' | 'player-sheet' | 'ready';
type DrawingTool = 'move' | 'terrain' | 'obstacle' | 'texture' | 'furniture' | 'fog' | 'erase';
type LayerKind = 'terrain' | 'obstacle' | 'texture' | 'furniture';
type TokenKind = 'player' | 'npc' | 'monster' | 'object';
type BoardKind = 'public' | 'gm';
type LootCrBand = '0-4' | '5-10' | '11-16' | '17+';

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
  visionRadius?: number;
};

type CharacterStats = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
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
};

type JournalEntry = {
  id: string;
  type: 'system' | 'move' | 'dice' | 'loot' | 'event' | 'sheet' | 'map' | 'room' | 'save';
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
  tokens: RoomToken[];
  sheets: CharacterSheet[];
  journal: JournalEntry[];
};

type SavedMapPreset = {
  id: string;
  name: string;
  mapName: string;
  mapState: MapState;
};

const DEFAULT_COLS = 16;
const DEFAULT_ROWS = 10;
const MIN_GRID = 4;
const MAX_GRID = 40;
const DEFAULT_TERRAIN = '#0f172a';
const roomAccessRegistry = new Map<string, RoomAccessState>();

const STORAGE_PREFIX = 'dnd-me-room:';
const DEFAULT_WIDGET_URL = 'https://tychmaps.com/waterdeep/';

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
    title: 'Смена давления в глубине руин',
    description: 'Опирается на раздел игровых механик и сцен, чтобы мастер быстро добавил локальное осложнение, шум или внезапное давление среды.',
    link: 'https://dnd.su/articles/mechanics/',
  },
  {
    title: 'Неожиданная находка в пути',
    description: 'Опирается на раздел инвентаря dnd.su, чтобы превращать исследование в маленькое событие: безделушку, припасы или зацепку.',
    link: 'https://dnd.su/articles/inventory/',
  },
  {
    title: 'Сцена для мастера из справочника',
    description: 'Опирается на основной справочник dnd.su как на стартовую ссылку для выбора конкретного существа, ловушки или предмета прямо во время сессии.',
    link: 'https://dnd.su/',
  },
];

const treasuryArticleLink = 'https://www.dnd.su/articles/inventory/74-treasury/';

const treasureCoinTables: Record<LootCrBand, Array<{ range: [number, number]; coins: string[] }>> = {
  '0-4': [
    { range: [1, 30], coins: ['5к6 мм'] },
    { range: [31, 60], coins: ['4к6 см'] },
    { range: [61, 70], coins: ['3к6 эм'] },
    { range: [71, 95], coins: ['3к6 зм'] },
    { range: [96, 100], coins: ['1к6 пм'] },
  ],
  '5-10': [
    { range: [1, 30], coins: ['4к6 × 100 мм', '1к6 × 10 эм'] },
    { range: [31, 60], coins: ['6к6 × 10 см', '2к6 × 10 зм'] },
    { range: [61, 70], coins: ['3к6 × 10 эм', '2к6 × 10 зм'] },
    { range: [71, 95], coins: ['4к6 × 10 зм'] },
    { range: [96, 100], coins: ['2к6 × 10 зм', '3к6 пм'] },
  ],
  '11-16': [
    { range: [1, 20], coins: ['4к6 × 100 см', '1к6 × 100 зм'] },
    { range: [21, 35], coins: ['1к6 × 100 эм', '1к6 × 100 зм'] },
    { range: [36, 75], coins: ['2к6 × 100 зм', '1к6 × 10 пм'] },
    { range: [76, 100], coins: ['2к6 × 100 зм', '2к6 × 10 пм'] },
  ],
  '17+': [
    { range: [1, 15], coins: ['2к6 × 1000 эм', '8к6 × 100 зм'] },
    { range: [16, 55], coins: ['1к6 × 1000 зм', '1к6 × 100 пм'] },
    { range: [56, 100], coins: ['1к6 × 1000 зм', '2к6 × 100 пм'] },
  ],
};

const hoardCoinTables: Record<LootCrBand, string[]> = {
  '0-4': ['6к6 × 100 мм', '3к6 × 100 см', '2к6 × 10 зм'],
  '5-10': ['2к6 × 100 мм', '2к6 × 1000 см', '6к6 × 100 зм', '3к6 × 10 пм'],
  '11-16': ['4к6 × 1000 зм', '5к6 × 100 пм'],
  '17+': ['12к6 × 1000 зм', '8к6 × 1000 пм'],
};

const hoardTables: Record<LootCrBand, Array<{ range: [number, number]; treasure: string; magic?: string }>> = {
  '0-4': [
    { range: [1, 6], treasure: 'Без дополнительных драгоценностей и произведений искусства.' },
    { range: [7, 16], treasure: '2к6 драгоценных камней стоимостью 10 зм.' },
    { range: [17, 26], treasure: '2к4 предметов искусства стоимостью 25 зм.' },
    { range: [27, 36], treasure: '2к6 драгоценных камней стоимостью 50 зм.' },
    { range: [37, 44], treasure: '2к6 драгоценных камней стоимостью 10 зм.', magic: '1к6 предметов из таблицы А.' },
    { range: [45, 52], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1к6 предметов из таблицы А.' },
    { range: [53, 60], treasure: '2к6 драгоценных камней стоимостью 50 зм.', magic: '1к6 предметов из таблицы А.' },
    { range: [61, 65], treasure: '2к6 драгоценных камней стоимостью 10 зм.', magic: '1к4 предметов из таблицы Б.' },
    { range: [66, 70], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1к4 предметов из таблицы Б.' },
    { range: [71, 75], treasure: '2к6 драгоценных камней стоимостью 50 зм.', magic: '1к4 предметов из таблицы Б.' },
    { range: [76, 78], treasure: '2к6 драгоценных камней стоимостью 10 зм.', magic: '1к4 предметов из таблицы В.' },
    { range: [79, 80], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1к4 предметов из таблицы В.' },
    { range: [81, 85], treasure: '2к6 драгоценных камней стоимостью 50 зм.', magic: '1к4 предметов из таблицы В.' },
    { range: [86, 92], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1к4 предметов из таблицы Е.' },
    { range: [93, 97], treasure: '2к6 драгоценных камней стоимостью 50 зм.', magic: '1к4 предметов из таблицы Е.' },
    { range: [98, 99], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1 предмет из таблицы Ё.' },
    { range: [100, 100], treasure: '2к6 драгоценных камней стоимостью 50 зм.', magic: '1 предмет из таблицы Ё.' },
  ],
  '5-10': [
    { range: [1, 4], treasure: 'Без дополнительных драгоценностей и произведений искусства.' },
    { range: [5, 10], treasure: '2к4 предметов искусства стоимостью 25 зм.' },
    { range: [11, 16], treasure: '3к6 драгоценных камней стоимостью 50 зм.' },
    { range: [17, 22], treasure: '3к6 драгоценных камней стоимостью 100 зм.' },
    { range: [23, 28], treasure: '2к4 предметов искусства стоимостью 250 зм.' },
    { range: [29, 32], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1к6 предметов из таблицы А.' },
    { range: [33, 36], treasure: '3к6 драгоценных камней стоимостью 50 зм.', magic: '1к6 предметов из таблицы А.' },
    { range: [37, 40], treasure: '3к6 драгоценных камней стоимостью 100 зм.', magic: '1к6 предметов из таблицы А.' },
    { range: [41, 44], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1к6 предметов из таблицы А.' },
    { range: [45, 49], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1к4 предметов из таблицы Б.' },
    { range: [50, 54], treasure: '3к6 драгоценных камней стоимостью 50 зм.', magic: '1к4 предметов из таблицы Б.' },
    { range: [55, 59], treasure: '3к6 драгоценных камней стоимостью 100 зм.', magic: '1к4 предметов из таблицы Б.' },
    { range: [60, 63], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1к4 предметов из таблицы Б.' },
    { range: [64, 66], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1к4 предметов из таблицы В.' },
    { range: [67, 69], treasure: '3к6 драгоценных камней стоимостью 50 зм.', magic: '1к4 предметов из таблицы В.' },
    { range: [70, 72], treasure: '3к6 драгоценных камней стоимостью 100 зм.', magic: '1к4 предметов из таблицы В.' },
    { range: [73, 74], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1к4 предметов из таблицы В.' },
    { range: [75, 76], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1 предмет из таблицы Г.' },
    { range: [77, 78], treasure: '3к6 драгоценных камней стоимостью 50 зм.', magic: '1 предмет из таблицы Г.' },
    { range: [79, 79], treasure: '3к6 драгоценных камней стоимостью 100 зм.', magic: '1 предмет из таблицы Г.' },
    { range: [80, 80], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1 предмет из таблицы Г.' },
    { range: [81, 84], treasure: '2к4 предметов искусства стоимостью 25 зм.', magic: '1к4 предметов из таблицы Е.' },
    { range: [85, 88], treasure: '3к6 драгоценных камней стоимостью 50 зм.', magic: '1к4 предметов из таблицы Е.' },
    { range: [89, 91], treasure: '3к6 драгоценных камней стоимостью 100 зм.', magic: '1к4 предметов из таблицы Е.' },
    { range: [92, 94], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1к4 предметов из таблицы Е.' },
    { range: [95, 96], treasure: '3к6 драгоценных камней стоимостью 100 зм.', magic: '1к4 предметов из таблицы Ё.' },
    { range: [97, 98], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1к4 предметов из таблицы Ё.' },
    { range: [99, 99], treasure: '3к6 драгоценных камней стоимостью 100 зм.', magic: '1 предмет из таблицы Ж.' },
    { range: [100, 100], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1 предмет из таблицы Ж.' },
  ],
  '11-16': [
    { range: [1, 3], treasure: 'Без дополнительных драгоценностей и произведений искусства.' },
    { range: [4, 6], treasure: '2к4 предметов искусства стоимостью 250 зм.' },
    { range: [7, 9], treasure: '2к4 предметов искусства стоимостью 750 зм.' },
    { range: [10, 12], treasure: '3к6 драгоценных камней стоимостью 500 зм.' },
    { range: [13, 15], treasure: '3к6 драгоценных камней стоимостью 1000 зм.' },
    { range: [16, 19], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1к4 предметов из таблицы А и 1к6 предметов из таблицы Б.' },
    { range: [20, 23], treasure: '2к4 предметов искусства стоимостью 750 зм.', magic: '1к4 предметов из таблицы А и 1к6 предметов из таблицы Б.' },
    { range: [24, 26], treasure: '3к6 драгоценных камней стоимостью 500 зм.', magic: '1к4 предметов из таблицы А и 1к6 предметов из таблицы Б.' },
    { range: [27, 29], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к4 предметов из таблицы А и 1к6 предметов из таблицы Б.' },
    { range: [30, 35], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1к6 предметов из таблицы В.' },
    { range: [36, 40], treasure: '2к4 предметов искусства стоимостью 750 зм.', magic: '1к6 предметов из таблицы В.' },
    { range: [41, 45], treasure: '3к6 драгоценных камней стоимостью 500 зм.', magic: '1к6 предметов из таблицы В.' },
    { range: [46, 50], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к6 предметов из таблицы В.' },
    { range: [51, 54], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1к4 предметов из таблицы Г.' },
    { range: [55, 58], treasure: '2к4 предметов искусства стоимостью 750 зм.', magic: '1к4 предметов из таблицы Г.' },
    { range: [59, 62], treasure: '3к6 драгоценных камней стоимостью 500 зм.', magic: '1к4 предметов из таблицы Г.' },
    { range: [63, 66], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к4 предметов из таблицы Г.' },
    { range: [67, 68], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1 предмет из таблицы Д.' },
    { range: [69, 70], treasure: '2к4 предметов искусства стоимостью 750 зм.', magic: '1 предмет из таблицы Д.' },
    { range: [71, 72], treasure: '3к6 драгоценных камней стоимостью 500 зм.', magic: '1 предмет из таблицы Д.' },
    { range: [73, 74], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1 предмет из таблицы Д.' },
    { range: [75, 76], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1 предмет из таблицы Е и 1к4 предметов из таблицы Ё.' },
    { range: [77, 78], treasure: '2к4 предметов искусства стоимостью 750 зм.', magic: '1 предмет из таблицы Е и 1к4 предметов из таблицы Ё.' },
    { range: [79, 80], treasure: '3к6 драгоценных камней стоимостью 500 зм.', magic: '1 предмет из таблицы Е и 1к4 предметов из таблицы Ё.' },
    { range: [81, 82], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1 предмет из таблицы Е и 1к4 предметов из таблицы Ё.' },
    { range: [83, 85], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1к4 предметов из таблицы Ж.' },
    { range: [86, 88], treasure: '2к4 предметов искусства стоимостью 750 зм.', magic: '1к4 предметов из таблицы Ж.' },
    { range: [89, 90], treasure: '3к6 драгоценных камней стоимостью 500 зм.', magic: '1к4 предметов из таблицы Ж.' },
    { range: [91, 92], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к4 предметов из таблицы Ж.' },
    { range: [93, 94], treasure: '2к4 предметов искусства стоимостью 250 зм.', magic: '1 предмет из таблицы З.' },
    { range: [95, 96], treasure: '2к4 предметов искусства стоимостью 750 зм.', magic: '1 предмет из таблицы З.' },
    { range: [97, 98], treasure: '3к6 драгоценных камней стоимостью 500 зм.', magic: '1 предмет из таблицы З.' },
    { range: [99, 100], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1 предмет из таблицы З.' },
  ],
  '17+': [
    { range: [1, 2], treasure: 'Без дополнительных драгоценностей и произведений искусства.' },
    { range: [3, 5], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к8 предметов из таблицы В.' },
    { range: [6, 8], treasure: '1к10 предметов искусства стоимостью 2500 зм.', magic: '1к8 предметов из таблицы В.' },
    { range: [9, 11], treasure: '1к4 предметов искусства стоимостью 7500 зм.', magic: '1к8 предметов из таблицы В.' },
    { range: [12, 14], treasure: '1к8 драгоценных камней стоимостью 5000 зм.', magic: '1к8 предметов из таблицы В.' },
    { range: [15, 22], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к6 предметов из таблицы Г.' },
    { range: [23, 30], treasure: '1к10 предметов искусства стоимостью 2500 зм.', magic: '1к6 предметов из таблицы Г.' },
    { range: [31, 38], treasure: '1к4 предметов искусства стоимостью 7500 зм.', magic: '1к6 предметов из таблицы Г.' },
    { range: [39, 46], treasure: '1к8 драгоценных камней стоимостью 5000 зм.', magic: '1к6 предметов из таблицы Г.' },
    { range: [47, 52], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к6 предметов из таблицы Д.' },
    { range: [53, 58], treasure: '1к10 предметов искусства стоимостью 2500 зм.', magic: '1к6 предметов из таблицы Д.' },
    { range: [59, 63], treasure: '1к4 предметов искусства стоимостью 7500 зм.', magic: '1к6 предметов из таблицы Д.' },
    { range: [64, 68], treasure: '1к8 драгоценных камней стоимостью 5000 зм.', magic: '1к6 предметов из таблицы Д.' },
    { range: [69, 69], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к4 предметов из таблицы Ё.' },
    { range: [70, 70], treasure: '1к10 предметов искусства стоимостью 2500 зм.', magic: '1к4 предметов из таблицы Ё.' },
    { range: [71, 71], treasure: '1к4 предметов искусства стоимостью 7500 зм.', magic: '1к4 предметов из таблицы Ё.' },
    { range: [72, 72], treasure: '1к8 драгоценных камней стоимостью 5000 зм.', magic: '1к4 предметов из таблицы Ё.' },
    { range: [73, 74], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к4 предметов из таблицы Ж.' },
    { range: [75, 76], treasure: '1к10 предметов искусства стоимостью 2500 зм.', magic: '1к4 предметов из таблицы Ж.' },
    { range: [77, 78], treasure: '1к4 предметов искусства стоимостью 7500 зм.', magic: '1к4 предметов из таблицы Ж.' },
    { range: [79, 80], treasure: '1к8 драгоценных камней стоимостью 5000 зм.', magic: '1к4 предметов из таблицы Ж.' },
    { range: [81, 85], treasure: '3к6 драгоценных камней стоимостью 1000 зм.', magic: '1к4 предметов из таблицы З.' },
    { range: [86, 90], treasure: '1к10 предметов искусства стоимостью 2500 зм.', magic: '1к4 предметов из таблицы З.' },
    { range: [91, 95], treasure: '1к4 предметов искусства стоимостью 7500 зм.', magic: '1к4 предметов из таблицы З.' },
    { range: [96, 100], treasure: '1к8 драгоценных камней стоимостью 5000 зм.', magic: '1к4 предметов из таблицы З.' },
  ],
};

const gemTables: Array<{ value: number; items: string[] }> = [
  { value: 10, items: ['Азурит', 'Бирюза', 'Гематит', 'Глазчатый агат', 'Голубой кварц', 'Лазурит', 'Малахит', 'Моховой агат', 'Обсидиан', 'Полосчатый агат', 'Родохрозит', 'Тигровый глаз'] },
  { value: 50, items: ['Гелиотроп', 'Звёздчатый розовый кварц', 'Кварц', 'Лунный камень', 'Оникс', 'Сардоникс', 'Сердолик', 'Халцедон', 'Хризопраз', 'Циркон', 'Цитрин', 'Яшма'] },
  { value: 100, items: ['Аметист', 'Гагат', 'Гранат', 'Жемчуг', 'Коралл', 'Нефрит', 'Турмалин', 'Хризоберилл', 'Шпинель', 'Янтарь'] },
  { value: 500, items: ['Аквамарин', 'Александрит', 'Синяя шпинель', 'Топаз', 'Хризолит', 'Чёрный жемчуг'] },
  { value: 1000, items: ['Голубой сапфир', 'Жёлтый сапфир', 'Огненный опал', 'Опал', 'Звёздчатый рубин', 'Звёздчатый сапфир', 'Изумруд', 'Чёрный опал'] },
];

const randomLootDefault: LootResult = {
  name: 'Сокровищница по таблицам dnd.su',
  details: 'Лут генерируется по таблицам статьи “Сокровищница”: индивидуальные монеты, сокровищница по ПО, реальные броски по магическим таблицам и ссылки на dnd.su.',
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
  'Зелье лечения': 'https://dnd.su/items/61-potion-of-healing/',
  'Зелье большого лечения': 'https://dnd.su/items/61-potion-of-healing/',
  'Зелье отличного лечения': 'https://dnd.su/items/61-potion-of-healing/',
  'Зелье превосходного лечения': 'https://dnd.su/items/61-potion-of-healing/',
  'Свиток заклинания (заговор)': 'https://dnd.su/items/210-spell-scroll/',
  'Свиток заклинания (1 уровень)': 'https://dnd.su/items/210-spell-scroll/',
  'Свиток заклинания (2 уровень)': 'https://dnd.su/items/210-spell-scroll/',
  'Свиток заклинания (3 уровень)': 'https://dnd.su/items/210-spell-scroll/',
  'Свиток заклинания (4 уровень)': 'https://dnd.su/items/210-spell-scroll/',
  'Свиток заклинания (5 уровень)': 'https://dnd.su/items/210-spell-scroll/',
  'Свиток заклинания (6 уровень)': 'https://dnd.su/items/210-spell-scroll/',
  'Свиток заклинания (7 уровень)': 'https://dnd.su/items/210-spell-scroll/',
  'Свиток заклинания (8 уровень)': 'https://dnd.su/items/210-spell-scroll/',
  'Свиток заклинания (9 уровень)': 'https://dnd.su/items/210-spell-scroll/',
  'Зелье лазания': 'https://dnd.su/items/60-potion-of-climbing/',
  'Сумка хранения': 'https://dnd.su/items/227-bag-of-holding/',
  'Парящая сфера': 'https://dnd.su/items/165-driftglobe/',
  'Зелье огненного дыхания': 'https://dnd.su/items/64-potion_of_fire_breath/',
  'Зелье сопротивления': 'https://dnd.su/items/69-potion-of-resistance/',
  'Боеприпасы +1': 'https://dnd.su/items/278-ammunition_1_2_3/',
  'Боеприпасы +2': 'https://dnd.su/items/278-ammunition_1_2_3/',
  'Боеприпасы +3': 'https://dnd.su/items/278-ammunition_1_2_3/',
  'Зелье дружбы с животными': 'https://dnd.su/items/58-potion-of-animal-friendship/',
  'Зелье силы холмового великана': 'https://dnd.su/items/67-potion_of_giant_strength/',
  'Зелье силы ледяного великана': 'https://dnd.su/items/67-potion_of_giant_strength/',
  'Зелье силы каменного великана': 'https://dnd.su/items/67-potion_of_giant_strength/',
  'Зелье силы огненного великана': 'https://dnd.su/items/67-potion_of_giant_strength/',
  'Зелье силы облачного великана': 'https://dnd.su/items/67-potion_of_giant_strength/',
  'Зелье силы штормового великана': 'https://dnd.su/items/67-potion_of_giant_strength/',
  'Зелье увеличения': 'https://dnd.su/items/70-potion-of-growth/',
  'Зелье подводного дыхания': 'https://dnd.su/items/65-potion-of-water-breathing/',
  'Мазь Кеогтома': 'https://dnd.su/items/126-keoghtoms-ointment/',
  'Масло ускользания': 'https://dnd.su/items/134-oil-of-slipperiness/',
  'Порошок исчезновения': 'https://dnd.su/items/182-dust-of-disappearance/',
  'Порошок сухости': 'https://dnd.su/items/183-dust_of_dryness/',
  'Порошок чихания и удушья': 'https://dnd.su/items/184-dust-of-sneezing-and-choking/',
  'Камень элементаля': 'https://dnd.su/items/83-elemental_gem/',
  'Любовное зелье': 'https://dnd.su/items/125-philter_of_love/',
  'Алхимический сосуд': 'https://dnd.su/items/2-alchemy_jug/',
  'Шапка подводного дыхания': 'https://dnd.su/items/249-cap_of_water_breathing/',
  'Плащ ската': 'https://dnd.su/items/175-cloak_of_the_manta_ray/',
  'Ночные очки': 'https://dnd.su/items/154-goggles_of_night/',
  'Шлем понимания языков': 'https://dnd.su/items/251-helm_of_comprehending_languages/',
  'Неподвижный жезл': 'https://dnd.su/items/153-immovable_rod/',
  'Фонарь обнаружения': 'https://dnd.su/items/244-lantern_of_revealing/',
  'Доспех моряка': 'https://dnd.su/items/35-mariners-armor/',
  'Мифрильный доспех': 'https://dnd.su/items/148-mithral_armor/',
  'Зелье яда': 'https://dnd.su/items/73-potion_of_poison/',
  'Кольцо плавания': 'https://dnd.su/items/101-ring_of_swimming/',
  'Мантия полезных предметов': 'https://dnd.su/items/130-robe-of-useful-items/',
  'Верёвка лазания': 'https://dnd.su/items/13-rope_of_climbing/',
  'Седло кавалериста': 'https://dnd.su/items/213-saddle_of_the_cavalier/',
  'Волшебная палочка обнаружения магии': 'https://dnd.su/items/19-wand_of_magic_detection/',
  'Волшебная палочка секретов': 'https://dnd.su/items/24-wand_of_secrets/',
  'Зелье ясновидения': 'https://dnd.su/items/74-potion_of_clairvoyance/',
  'Зелье уменьшения': 'https://dnd.su/items/71-potion-of-diminution/',
  'Зелье газообразной формы': 'https://dnd.su/items/55-potion-of-gaseous-form/',
  'Зелье героизма': 'https://dnd.su/items/56-potion_of_heroism/',
  'Зелье неуязвимости': 'https://dnd.su/items/63-potion_of_invulnerability/',
  'Зелье чтения мыслей': 'https://dnd.su/items/72-potion_of_mind_reading/',
  'Эликсир здоровья': 'https://dnd.su/items/258-elixir_of_health/',
  'Масло эфирности': 'https://dnd.su/items/135-oil-of-etherealness/',
  'Перо Кваля': 'https://dnd.su/items/167-quaals-feather-token/',
  'Свиток защиты': 'https://dnd.su/items/211-scroll_of_protection/',
  'Сумка с бобами': 'https://dnd.su/items/225-bag-of-beans/',
  'Бусина силы': 'https://dnd.su/items/10-bead-of-force/',
  'Колокольчик открывания': 'https://dnd.su/items/91-chime-of-opening/',
  'Графин бесконечной воды': 'https://dnd.su/items/30-decanter-of-endless-water/',
  'Очки детального зрения': 'https://dnd.su/items/162-eyes-of-minute-seeing/',
  'Складная лодка': 'https://dnd.su/items/216-folding-boat/',
  'Удобный рюкзак Хеварда': 'https://dnd.su/items/242-hewards-handy-haversack/',
  'Подковы скорости': 'https://dnd.su/items/180-horseshoes_of_speed/',
  'Ожерелье огненных шаров': 'https://dnd.su/items/158-necklace-of-fireballs/',
  'Медальон здоровья': 'https://dnd.su/items/139-periapt_of_health/',
  'Камни послания': 'https://dnd.su/items/84-sending_stones/',
  'Зелье невидимости': 'https://dnd.su/items/62-potion_of_invisibility/',
  'Зелье скорости': 'https://dnd.su/items/68-potion_of_speed/',
  'Масло остроты': 'https://dnd.su/items/133-oil_of_sharpness/',
  'Зелье полёта': 'https://dnd.su/items/66-potion-of-flying/',
  'Зелье долголетия': 'https://dnd.su/items/57-potion_of_longevity/',
  'Зелье живучести': 'https://dnd.su/items/59-potion_of_vitality/',
  'Подковы ветра': 'https://dnd.su/items/179-horseshoes-of-a-zephyr/',
  'Чудесные краски Нолзура': 'https://dnd.su/items/247-nolzurs-marvelous-pigments/',
  'Сумка пожирания': 'https://dnd.su/items/224-bag-of-devouring/',
};

const magicItemTables: Record<string, MagicItemRoll[]> = {
  А: [
    { range: [1, 50], name: 'Зелье лечения' },
    { range: [51, 60], name: 'Свиток заклинания (заговор)' },
    { range: [61, 70], name: 'Зелье лазания' },
    { range: [71, 90], name: 'Свиток заклинания (1 уровень)' },
    { range: [91, 94], name: 'Свиток заклинания (2 уровень)' },
    { range: [95, 98], name: 'Зелье большого лечения' },
    { range: [99, 99], name: 'Сумка хранения' },
    { range: [100, 100], name: 'Парящая сфера' },
  ],
  Б: [
    { range: [1, 15], name: 'Зелье большого лечения' },
    { range: [16, 22], name: 'Зелье огненного дыхания' },
    { range: [23, 29], name: 'Зелье сопротивления' },
    { range: [30, 34], name: 'Боеприпасы +1' },
    { range: [35, 39], name: 'Зелье дружбы с животными' },
    { range: [40, 44], name: 'Зелье силы холмового великана' },
    { range: [45, 49], name: 'Зелье увеличения' },
    { range: [50, 54], name: 'Зелье подводного дыхания' },
    { range: [55, 59], name: 'Свиток заклинания (2 уровень)' },
    { range: [60, 64], name: 'Свиток заклинания (3 уровень)' },
    { range: [65, 67], name: 'Сумка хранения' },
    { range: [68, 70], name: 'Мазь Кеогтома' },
    { range: [71, 73], name: 'Масло ускользания' },
    { range: [74, 75], name: 'Порошок исчезновения' },
    { range: [76, 77], name: 'Порошок сухости' },
    { range: [78, 79], name: 'Порошок чихания и удушья' },
    { range: [80, 81], name: 'Камень элементаля' },
    { range: [82, 83], name: 'Любовное зелье' },
    { range: [84, 84], name: 'Алхимический сосуд' },
    { range: [85, 85], name: 'Шапка подводного дыхания' },
    { range: [86, 86], name: 'Плащ ската' },
    { range: [87, 87], name: 'Парящая сфера' },
    { range: [88, 88], name: 'Ночные очки' },
    { range: [89, 89], name: 'Шлем понимания языков' },
    { range: [90, 90], name: 'Неподвижный жезл' },
    { range: [91, 91], name: 'Фонарь обнаружения' },
    { range: [92, 92], name: 'Доспех моряка' },
    { range: [93, 93], name: 'Мифрильный доспех' },
    { range: [94, 94], name: 'Зелье яда' },
    { range: [95, 95], name: 'Кольцо плавания' },
    { range: [96, 96], name: 'Мантия полезных предметов' },
    { range: [97, 97], name: 'Верёвка лазания' },
    { range: [98, 98], name: 'Седло кавалериста' },
    { range: [99, 99], name: 'Волшебная палочка обнаружения магии' },
    { range: [100, 100], name: 'Волшебная палочка секретов' },
  ],
  В: [
    { range: [1, 15], name: 'Зелье отличного лечения' },
    { range: [16, 22], name: 'Свиток заклинания (4 уровень)' },
    { range: [23, 27], name: 'Боеприпасы +2' },
    { range: [28, 32], name: 'Зелье ясновидения' },
    { range: [33, 37], name: 'Зелье уменьшения' },
    { range: [38, 42], name: 'Зелье газообразной формы' },
    { range: [43, 47], name: 'Зелье силы ледяного великана' },
    { range: [48, 52], name: 'Зелье силы каменного великана' },
    { range: [53, 57], name: 'Зелье героизма' },
    { range: [58, 62], name: 'Зелье неуязвимости' },
    { range: [63, 67], name: 'Зелье чтения мыслей' },
    { range: [68, 72], name: 'Свиток заклинания (5 уровень)' },
    { range: [73, 75], name: 'Эликсир здоровья' },
    { range: [76, 78], name: 'Масло эфирности' },
    { range: [79, 81], name: 'Зелье силы огненного великана' },
    { range: [82, 84], name: 'Перо Кваля' },
    { range: [85, 87], name: 'Свиток защиты' },
    { range: [88, 89], name: 'Сумка с бобами' },
    { range: [90, 91], name: 'Бусина силы' },
    { range: [92, 92], name: 'Колокольчик открывания' },
    { range: [93, 93], name: 'Графин бесконечной воды' },
    { range: [94, 94], name: 'Очки детального зрения' },
    { range: [95, 95], name: 'Складная лодка' },
    { range: [96, 96], name: 'Удобный рюкзак Хеварда' },
    { range: [97, 97], name: 'Подковы скорости' },
    { range: [98, 98], name: 'Ожерелье огненных шаров' },
    { range: [99, 99], name: 'Медальон здоровья' },
    { range: [100, 100], name: 'Камни послания' },
  ],
  Г: [
    { range: [1, 20], name: 'Зелье превосходного лечения' },
    { range: [21, 30], name: 'Зелье невидимости' },
    { range: [31, 40], name: 'Зелье скорости' },
    { range: [41, 50], name: 'Свиток заклинания (6 уровень)' },
    { range: [51, 57], name: 'Свиток заклинания (7 уровень)' },
    { range: [58, 62], name: 'Боеприпасы +3' },
    { range: [63, 67], name: 'Масло остроты' },
    { range: [68, 72], name: 'Зелье полёта' },
    { range: [73, 77], name: 'Зелье силы облачного великана' },
    { range: [78, 82], name: 'Зелье долголетия' },
    { range: [83, 87], name: 'Зелье живучести' },
    { range: [88, 92], name: 'Свиток заклинания (8 уровень)' },
    { range: [93, 95], name: 'Подковы ветра' },
    { range: [96, 98], name: 'Чудесные краски Нолзура' },
    { range: [99, 99], name: 'Сумка пожирания' },
    { range: [100, 100], name: 'Переносная дыра' },
  ],
  Д: [
    { range: [1, 30], name: 'Свиток заклинания (8 уровень)' },
    { range: [31, 55], name: 'Зелье силы штормового великана' },
    { range: [56, 70], name: 'Зелье превосходного лечения' },
    { range: [71, 85], name: 'Свиток заклинания (9 уровень)' },
    { range: [86, 93], name: 'Универсальный растворитель' },
    { range: [94, 98], name: 'Стрела убийства' },
    { range: [99, 100], name: 'Превосходный клей' },
  ],
  Е: [
    { range: [1, 15], name: 'Оружие +1' },
    { range: [16, 18], name: 'Щит +1' },
    { range: [19, 21], name: 'Щит часового' },
    { range: [22, 23], name: 'Амулет защиты от обнаружения и поиска' },
    { range: [24, 25], name: 'Эльфийские сапоги' },
    { range: [26, 27], name: 'Сапоги ходьбы и прыжков' },
    { range: [28, 29], name: 'Наручи стрельбы из лука' },
    { range: [30, 31], name: 'Брошь защиты' },
    { range: [32, 33], name: 'Помело полёта' },
    { range: [34, 35], name: 'Эльфийский плащ' },
    { range: [36, 37], name: 'Плащ защиты' },
    { range: [38, 39], name: 'Рукавицы силы огра' },
    { range: [40, 41], name: 'Шапка маскировки' },
    { range: [42, 43], name: 'Метательное копьё молнии' },
    { range: [44, 45], name: 'Жемчужина силы' },
    { range: [46, 47], name: 'Жезл хранителя договора +1' },
    { range: [48, 49], name: 'Туфли паука' },
    { range: [50, 51], name: 'Посох гадюки' },
    { range: [52, 53], name: 'Посох питона' },
    { range: [54, 55], name: 'Меч мести' },
    { range: [56, 57], name: 'Трезубец командования рыбами' },
    { range: [58, 59], name: 'Волшебная палочка снарядов' },
    { range: [60, 61], name: 'Волшебная палочка боевого мага +1' },
    { range: [62, 63], name: 'Волшебная палочка паутины' },
    { range: [64, 65], name: 'Оружие предупреждения' },
    { range: [66, 66], name: 'Адамантиновый доспех (кольчуга)' },
    { range: [67, 67], name: 'Адамантиновый доспех (кольчужная рубаха)' },
    { range: [68, 68], name: 'Адамантиновый доспех (чешуйчатый)' },
    { range: [69, 69], name: 'Сумка фокусов (серая)' },
    { range: [70, 70], name: 'Сумка фокусов (рыжая)' },
    { range: [71, 71], name: 'Сумка фокусов (коричневая)' },
    { range: [72, 72], name: 'Заполярные сапоги' },
    { range: [73, 73], name: 'Обруч сжигания' },
    { range: [74, 74], name: 'Колода иллюзий' },
    { range: [75, 75], name: 'Вечнодымящаяся бутылка' },
    { range: [76, 76], name: 'Очки очарования' },
    { range: [77, 77], name: 'Очки орлиного зрения' },
    { range: [78, 78], name: 'Статуэтка чудесной силы (серебряный ворон)' },
    { range: [79, 79], name: 'Камень сияния' },
    { range: [80, 80], name: 'Перчатки ловли снарядов' },
    { range: [81, 81], name: 'Перчатки плавания и лазания' },
    { range: [82, 82], name: 'Перчатки воровства' },
    { range: [83, 83], name: 'Повязка интеллекта' },
    { range: [84, 84], name: 'Шлем телепатии' },
    { range: [85, 85], name: 'Инструмент бардов (лютня Досс)' },
    { range: [86, 86], name: 'Инструмент бардов (бандура Фоклучан)' },
    { range: [87, 87], name: 'Инструмент бардов (цитра Мак-Фуирми)' },
    { range: [88, 88], name: 'Медальон мыслей' },
    { range: [89, 89], name: 'Ожерелье адаптации' },
    { range: [90, 90], name: 'Медальон затягивающихся ран' },
    { range: [91, 91], name: 'Свирель ужаса' },
    { range: [92, 92], name: 'Свирель канализации' },
    { range: [93, 93], name: 'Кольцо прыжков' },
    { range: [94, 94], name: 'Кольцо защиты разума' },
    { range: [95, 95], name: 'Кольцо тепла' },
    { range: [96, 96], name: 'Кольцо хождения по воде' },
    { range: [97, 97], name: 'Колчан Элонны' },
    { range: [98, 98], name: 'Камень удачи' },
    { range: [99, 99], name: 'Веер ветра' },
    { range: [100, 100], name: 'Крылатые сапоги' },
  ],
  Ё: [
    { range: [1, 11], name: 'Оружие +2' },
    { range: [12, 14], name: 'Статуэтка чудесной силы' },
    { range: [15, 15], name: 'Адамантиновый доспех (кираса)' },
    { range: [16, 16], name: 'Адамантиновый доспех (наборный)' },
    { range: [17, 17], name: 'Амулет здоровья' },
    { range: [18, 18], name: 'Доспех уязвимости' },
    { range: [19, 19], name: 'Ловящий стрелы щит' },
    { range: [20, 20], name: 'Пояс дварфов' },
    { range: [21, 21], name: 'Пояс силы холмового великана' },
    { range: [22, 22], name: 'Топор берсерка' },
    { range: [23, 23], name: 'Сапоги левитации' },
    { range: [24, 24], name: 'Сапоги скорости' },
    { range: [25, 25], name: 'Чаша командования водяными элементалями' },
    { range: [26, 26], name: 'Наручи защиты' },
    { range: [27, 27], name: 'Жаровня командования огненными элементалями' },
    { range: [28, 28], name: 'Плащ шарлатана' },
    { range: [29, 29], name: 'Кадило контролирования воздушных элементалей' },
    { range: [30, 30], name: 'Доспех +1 (кольчуга)' },
    { range: [31, 31], name: 'Доспех сопротивления (кольчуга)' },
    { range: [32, 32], name: 'Доспех +1 (кольчужная рубаха)' },
    { range: [33, 33], name: 'Доспех сопротивления (кольчужная рубаха)' },
    { range: [34, 34], name: 'Плащ ускользания' },
    { range: [35, 35], name: 'Плащ летучей мыши' },
    { range: [36, 36], name: 'Куб силового поля' },
    { range: [37, 37], name: 'Мгновенная крепость Даэрна' },
    { range: [38, 38], name: 'Кинжал яда' },
    { range: [39, 39], name: 'Оковы измерений' },
    { range: [40, 40], name: 'Убийца драконов' },
    { range: [41, 41], name: 'Эльфийская кольчуга' },
    { range: [42, 42], name: 'Язык пламени' },
    { range: [43, 43], name: 'Камень зрения' },
    { range: [44, 44], name: 'Убийца великанов' },
    { range: [45, 45], name: 'Красивый проклёпанный кожаный доспех' },
    { range: [46, 46], name: 'Шлем телепортации' },
    { range: [47, 47], name: 'Рог взрыва' },
    { range: [48, 48], name: 'Рог Валгаллы (серебряный или латунный)' },
    { range: [49, 49], name: 'Инструмент бардов (мандолина Канаит)' },
    { range: [50, 50], name: 'Инструмент бардов (лира Кли)' },
    { range: [51, 51], name: 'Камень Йоун (восприятие)' },
    { range: [52, 52], name: 'Камень Йоун (защита)' },
    { range: [53, 53], name: 'Камень Йоун (резерв)' },
    { range: [54, 54], name: 'Камень Йоун (питание)' },
    { range: [55, 55], name: 'Железные ленты Биларро' },
    { range: [56, 56], name: 'Доспех +1 (кожаный)' },
    { range: [57, 57], name: 'Доспех сопротивления (кожаный)' },
    { range: [58, 58], name: 'Булава распада' },
    { range: [59, 59], name: 'Булава кары' },
    { range: [60, 60], name: 'Булава ужаса' },
    { range: [61, 61], name: 'Мантия сопротивления заклинаниям' },
    { range: [62, 62], name: 'Ожерелье молитвенных чёток' },
    { range: [63, 63], name: 'Медальон защиты от яда' },
    { range: [64, 64], name: 'Кольцо влияния на животных' },
    { range: [65, 65], name: 'Кольцо уклонения' },
    { range: [66, 66], name: 'Кольцо падения пёрышком' },
    { range: [67, 67], name: 'Кольцо свободных действий' },
    { range: [68, 68], name: 'Кольцо защиты' },
    { range: [69, 69], name: 'Кольцо сопротивления' },
    { range: [70, 70], name: 'Кольцо хранения заклинаний' },
    { range: [71, 71], name: 'Кольцо тарана' },
    { range: [72, 72], name: 'Кольцо проникающего зрения' },
    { range: [73, 73], name: 'Мантия глаз' },
    { range: [74, 74], name: 'Жезл правления' },
    { range: [75, 75], name: 'Жезл хранителя договора +2' },
    { range: [76, 76], name: 'Верёвка опутывания' },
    { range: [77, 77], name: 'Доспех +1 (чешуйчатый)' },
    { range: [78, 78], name: 'Доспех сопротивления (чешуйчатый)' },
    { range: [79, 79], name: 'Щит +2' },
    { range: [80, 80], name: 'Щит притягивания снарядов' },
    { range: [81, 81], name: 'Посох очарования' },
    { range: [82, 82], name: 'Посох лечения' },
    { range: [83, 83], name: 'Посох роя насекомых' },
    { range: [84, 84], name: 'Посох леса' },
    { range: [85, 85], name: 'Посох иссушения' },
    { range: [86, 86], name: 'Камень контролирования земляных элементалей' },
    { range: [87, 87], name: 'Солнечный клинок' },
    { range: [88, 88], name: 'Меч кражи жизни' },
    { range: [89, 89], name: 'Меч ранения' },
    { range: [90, 90], name: 'Жезл щупалец' },
    { range: [91, 91], name: 'Жестокое оружие' },
    { range: [92, 92], name: 'Волшебная палочка сковывания' },
    { range: [93, 93], name: 'Волшебная палочка обнаружения врагов' },
    { range: [94, 94], name: 'Волшебная палочка страха' },
    { range: [95, 95], name: 'Волшебная палочка огненных шаров' },
    { range: [96, 96], name: 'Волшебная палочка молний' },
    { range: [97, 97], name: 'Волшебная палочка паралича' },
    { range: [98, 98], name: 'Волшебная палочка боевого мага +2' },
    { range: [99, 99], name: 'Волшебная палочка чудес' },
    { range: [100, 100], name: 'Крылья полёта' },
  ],
  Ж: [
    { range: [1, 10], name: 'Оружие +3' },
    { range: [11, 12], name: 'Амулет планов' },
    { range: [13, 14], name: 'Ковёр-самолёт' },
    { range: [15, 16], name: 'Хрустальный шар (очень редкая версия)' },
    { range: [17, 18], name: 'Кольцо регенерации' },
    { range: [19, 20], name: 'Кольцо падающих звёзд' },
    { range: [21, 22], name: 'Кольцо телекинеза' },
    { range: [23, 24], name: 'Мантия сияющих цветов' },
    { range: [25, 26], name: 'Мантия звёзд' },
    { range: [27, 28], name: 'Жезл поглощения' },
    { range: [29, 30], name: 'Жезл бдительности' },
    { range: [31, 32], name: 'Жезл безопасности' },
    { range: [33, 34], name: 'Жезл хранителя договора +3' },
    { range: [35, 36], name: 'Скимитар скорости' },
    { range: [37, 38], name: 'Щит +3' },
    { range: [39, 40], name: 'Посох огня' },
    { range: [41, 42], name: 'Посох мороза' },
    { range: [43, 44], name: 'Посох силы' },
    { range: [45, 46], name: 'Посох ударов' },
    { range: [47, 48], name: 'Посох грома и молнии' },
    { range: [49, 50], name: 'Меч остроты' },
    { range: [51, 52], name: 'Волшебная палочка превращения' },
    { range: [53, 54], name: 'Волшебная палочка боевого мага +3' },
    { range: [55, 55], name: 'Адамантиновый доспех (полулаты)' },
    { range: [56, 56], name: 'Адамантиновый доспех (латы)' },
    { range: [57, 57], name: 'Живой щит' },
    { range: [58, 58], name: 'Пояс силы огненного великана' },
    { range: [59, 59], name: 'Пояс силы ледяного великана (или каменного)' },
    { range: [60, 60], name: 'Доспех +1 (кираса)' },
    { range: [61, 61], name: 'Доспех сопротивления (кираса)' },
    { range: [62, 62], name: 'Свеча мольбы' },
    { range: [63, 63], name: 'Доспех +2 (кольчуга)' },
    { range: [64, 64], name: 'Доспех +2 (кольчужная рубаха)' },
    { range: [65, 65], name: 'Плащ паука' },
    { range: [66, 66], name: 'Танцующий меч' },
    { range: [67, 67], name: 'Демонический доспех' },
    { range: [68, 68], name: 'Доспех из драконьей чешуи' },
    { range: [69, 69], name: 'Латы дварфов' },
    { range: [70, 70], name: 'Дварфский метатель' },
    { range: [71, 71], name: 'Бутылка с ифритом' },
    { range: [72, 72], name: 'Статуэтка чудесной силы (обсидиановый скакун)' },
    { range: [73, 73], name: 'Морозный клинок' },
    { range: [74, 74], name: 'Шлем блеска' },
    { range: [75, 75], name: 'Рог Валгаллы (бронзовый)' },
    { range: [76, 76], name: 'Инструмент бардов (арфа Анструт)' },
    { range: [77, 77], name: 'Камень Йоун (поглощение)' },
    { range: [78, 78], name: 'Камень Йоун (проворство)' },
    { range: [79, 79], name: 'Камень Йоун (стойкость)' },
    { range: [80, 80], name: 'Камень Йоун (проницательность)' },
    { range: [81, 81], name: 'Камень Йоун (рассудок)' },
    { range: [82, 82], name: 'Камень Йоун (лидерство)' },
    { range: [83, 83], name: 'Камень Йоун (сила)' },
    { range: [84, 84], name: 'Доспех +2 (кожаный)' },
    { range: [85, 85], name: 'Справочник телесного здоровья' },
    { range: [86, 86], name: 'Справочник полезных упражнений' },
    { range: [87, 87], name: 'Справочник по големам' },
    { range: [88, 88], name: 'Справочник быстроты действий' },
    { range: [89, 89], name: 'Зеркало похищения жизни' },
    { range: [90, 90], name: 'Вор девяти жизней' },
    { range: [91, 91], name: 'Лук клятвы' },
    { range: [92, 92], name: 'Доспех +2 (чешуйчатый)' },
    { range: [93, 93], name: 'Щит от заклинаний' },
    { range: [94, 94], name: 'Доспех +1 (наборный)' },
    { range: [95, 95], name: 'Доспех сопротивления (наборный)' },
    { range: [96, 96], name: 'Доспех +1 (проклёпанный кожаный)' },
    { range: [97, 97], name: 'Доспех сопротивления (проклёпанный кожаный)' },
    { range: [98, 98], name: 'Том чистых мыслей' },
    { range: [99, 99], name: 'Том лидерства и влияния' },
    { range: [100, 100], name: 'Том понимания' },
  ],
  З: [
    { range: [1, 5], name: 'Защитник' },
    { range: [6, 10], name: 'Молот грома' },
    { range: [11, 15], name: 'Клинок удачи' },
    { range: [16, 20], name: 'Меч ответа' },
    { range: [21, 23], name: 'Святой мститель' },
    { range: [24, 26], name: 'Кольцо призыва джинна' },
    { range: [27, 29], name: 'Кольцо невидимости' },
    { range: [30, 32], name: 'Кольцо отражения заклинаний' },
    { range: [33, 35], name: 'Жезл величественной мощи' },
    { range: [36, 38], name: 'Посох магов' },
    { range: [39, 41], name: 'Меч головоруб' },
    { range: [42, 43], name: 'Пояс силы облачного великана' },
    { range: [44, 45], name: 'Доспех +2 (кираса)' },
    { range: [46, 47], name: 'Доспех +3 (кольчуга)' },
    { range: [48, 49], name: 'Доспех +3 (кольчужная рубаха)' },
    { range: [50, 51], name: 'Плащ невидимости' },
    { range: [52, 53], name: 'Хрустальный шар (легендарная версия)' },
    { range: [54, 55], name: 'Доспех +1 (полулаты)' },
    { range: [56, 57], name: 'Железная фляга' },
    { range: [58, 59], name: 'Доспех +3 (кожаный)' },
    { range: [60, 61], name: 'Доспех +1 (латы)' },
    { range: [62, 63], name: 'Мантия архимага' },
    { range: [64, 65], name: 'Жезл воскрешения' },
    { range: [66, 67], name: 'Доспех +1 (чешуйчатый)' },
    { range: [68, 69], name: 'Скарабей защиты' },
    { range: [70, 71], name: 'Доспех +2 (наборный)' },
    { range: [72, 73], name: 'Доспех +2 (проклёпанная кожа)' },
    { range: [74, 75], name: 'Колодец многих миров' },
    { range: [76, 76], name: 'Магический доспех' },
    { range: [77, 77], name: 'Аппарат Квалиша' },
    { range: [78, 78], name: 'Доспех неуязвимости' },
    { range: [79, 79], name: 'Пояс силы великана (штормовой)' },
    { range: [80, 80], name: 'Куб врат' },
    { range: [81, 81], name: 'Колода многих вещей' },
    { range: [82, 82], name: 'Кольчуга ифритов' },
    { range: [83, 83], name: 'Доспех сопротивления (полулаты)' },
    { range: [84, 84], name: 'Рог Валгаллы (железный)' },
    { range: [85, 85], name: 'Инструмент бардов (арфа Оллава)' },
    { range: [86, 86], name: 'Камень Йоун (большое поглощение)' },
    { range: [87, 87], name: 'Камень Йоун (мастерство)' },
    { range: [88, 88], name: 'Камень Йоун (регенерация)' },
    { range: [89, 89], name: 'Латный доспех эфирности' },
    { range: [90, 90], name: 'Доспех сопротивления (латы)' },
    { range: [91, 91], name: 'Кольцо командования воздушными элементалями' },
    { range: [92, 92], name: 'Кольцо командования земляными элементалями' },
    { range: [93, 93], name: 'Кольцо командования огненными элементалями' },
    { range: [94, 94], name: 'Кольцо трёх желаний' },
    { range: [95, 95], name: 'Кольцо командования водяными элементалями' },
    { range: [96, 96], name: 'Сфера аннигиляции' },
    { range: [97, 97], name: 'Талисман чистого добра' },
    { range: [98, 98], name: 'Талисман сферы' },
    { range: [99, 99], name: 'Талисман абсолютного зла' },
    { range: [100, 100], name: 'Том молчаливого языка' },
  ],
};

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
    visionRadius: 3,
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
    visionRadius: 3,
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
    gmOnly: true,
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

function rollDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDiceExpression(expression: string) {
  const match = expression.match(/(\d+)к(\d+)/i);
  if (!match) return 1;

  const count = Number(match[1]);
  const sides = Number(match[2]);
  return Array.from({ length: count }, () => rollDie(sides)).reduce((sum, roll) => sum + roll, 0);
}

function rollGemItems(treasureText: string) {
  const countMatch = treasureText.match(/(\d+к\d+)\s+драгоценных камней стоимостью (\d+) зм/i);
  if (!countMatch) return [];

  const count = rollDiceExpression(countMatch[1]);
  const value = Number(countMatch[2]);
  const gemBucket = gemTables.find((entry) => entry.value === value);
  if (!gemBucket) return [];

  return Array.from({ length: count }, () => gemBucket.items[Math.floor(Math.random() * gemBucket.items.length)]);
}

function rollMagicItemFromTable(letter: string) {
  const table = magicItemTables[letter];
  if (!table?.length) return null;

  const roll = rollDie(100);
  const match = table.find((entry) => roll >= entry.range[0] && roll <= entry.range[1]);
  if (!match) return null;
  const directLink = magicItemDirectLinks[match.name] ?? magicItemTableLinks[letter];

  if (letter === 'Ё' && match.name === 'Статуэтка чудесной силы') {
    const statueRoll = rollDie(8);
    const statueName =
      statueRoll === 1
        ? 'Статуэтка чудесной силы (бронзовый грифон)'
        : statueRoll === 2
          ? 'Статуэтка чудесной силы (эбеновая муха)'
          : statueRoll === 3
            ? 'Статуэтка чудесной силы (золотые львы)'
            : statueRoll === 4
              ? 'Статуэтка чудесной силы (костяные козлы)'
              : statueRoll === 5
                ? 'Статуэтка чудесной силы (мраморный слон)'
                : statueRoll <= 7
                  ? 'Статуэтка чудесной силы (ониксовая собака)'
                  : 'Статуэтка чудесной силы (серпентиновая сова)';

    return { table: letter, roll, name: `${statueName}, доп. бросок к8: ${statueRoll}`, link: magicItemTableLinks[letter] };
  }

  if (letter === 'Ж' && match.name === 'Пояс силы ледяного великана (или каменного)') {
    const variant = rollDie(2) === 1 ? 'Пояс силы ледяного великана' : 'Пояс силы каменного великана';
    return { table: letter, roll, name: variant, link: magicItemDirectLinks[variant] ?? magicItemTableLinks[letter] };
  }

  if (letter === 'З' && match.name === 'Магический доспех') {
    const armorRoll = rollDie(12);
    const armorName =
      armorRoll <= 2
        ? 'Доспех +2 (полулаты)'
        : armorRoll <= 4
          ? 'Доспех +2 (латы)'
          : armorRoll <= 6
            ? 'Доспех +3 (проклёпанная кожа)'
            : armorRoll <= 8
              ? 'Доспех +3 (кираса)'
              : armorRoll <= 10
                ? 'Доспех +3 (наборный)'
                : armorRoll === 11
                  ? 'Доспех +3 (полулаты)'
                  : 'Доспех +3 (латы)';

    return { table: letter, roll, name: `${armorName}, доп. бросок к12: ${armorRoll}`, link: magicItemDirectLinks[armorName] ?? magicItemTableLinks[letter] };
  }

  return { table: letter, roll, name: match.name, link: directLink };
}

function rollMagicFromReference(reference: string) {
  const normalized = reference.replace('таблицы', 'таблица').replace('таблицу', 'таблица');
  const parts = normalized.split(' и ').map((part) => part.trim());
  const results: Array<{ table: string; roll: number; name: string; link: string }> = [];

  for (const part of parts) {
    const match = part.match(/(?:(\d+к\d+)|(\d+))\s+предмет(?:ов)?\s+из\s+таблица\s+([А-ЗЁ])/i) ?? part.match(/(?:(\d+к\d+)|(\d+))\s+предмет(?:ов)?\s+из\s+таблицы\s+([А-ЗЁ])/i);
    if (!match) continue;

    const count = match[1] ? rollDiceExpression(match[1]) : Number(match[2] || 1);
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
  const individualCoins = treasureCoinTables[crBand].find((entry) => d100 >= entry.range[0] && d100 <= entry.range[1]) ?? treasureCoinTables[crBand][0];
  const hoardRow = hoardTables[crBand].find((entry) => d100 >= entry.range[0] && d100 <= entry.range[1]) ?? hoardTables[crBand][0];
  const rolledGems = rollGemItems(hoardRow.treasure);
  const magicItems = hoardRow.magic ? rollMagicFromReference(hoardRow.magic) : [];

  return {
    name: `Клад по таблице ПО ${crBand}`,
    details: [
      `Бросок к100: ${d100}.`,
      `Монеты сокровищницы: ${hoardCoinTables[crBand].join(', ')}.`,
      `Индивидуальные монеты для этой же группы ПО: ${individualCoins.coins.join(', ')}.`,
      `Строка сокровищницы: ${hoardRow.treasure}`,
      hoardRow.magic ? `Магические предметы: ${hoardRow.magic}` : 'Магические предметы: без дополнительных бросков.',
      magicItems.length ? `Реальные броски по таблицам dnd.su: ${magicItems.map((item) => `${item.table}${String(item.roll).padStart(2, '0')} → ${item.name}`).join('; ')}.` : '',
      rolledGems.length ? `Выпавшие камни: ${rolledGems.join(', ')}.` : '',
      'Источник: таблицы статьи “Сокровищница” на dnd.su.',
    ].join(' '),
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

    if (!found) continue;
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

function readDocumentText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => readDocumentText(item)).filter(Boolean).join('\n');
  if (typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;

  if (typeof record.text === 'string') return record.text;
  if (record.value) return readDocumentText(record.value);
  if (record.data) return readDocumentText(record.data);
  if (Array.isArray(record.content)) {
    return record.content
      .map((item) => readDocumentText(item))
      .filter(Boolean)
      .join(record.type === 'paragraph' ? '' : '\n');
  }

  return '';
}

function normalizeMultiline(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .join('\n');
}

function extractStats(stats: Record<string, unknown> | undefined): CharacterStats {
  return {
    str: Number((stats?.str as Record<string, unknown> | undefined)?.score ?? 10),
    dex: Number((stats?.dex as Record<string, unknown> | undefined)?.score ?? 10),
    con: Number((stats?.con as Record<string, unknown> | undefined)?.score ?? 10),
    int: Number((stats?.int as Record<string, unknown> | undefined)?.score ?? 10),
    wis: Number((stats?.wis as Record<string, unknown> | undefined)?.score ?? 10),
    cha: Number((stats?.cha as Record<string, unknown> | undefined)?.score ?? 10),
  };
}

function parseLongStoryShortCharacter(raw: unknown): Partial<CharacterSheet> | null {
  if (!raw || typeof raw !== 'object') return null;

  const source = raw as Record<string, unknown>;
  const embeddedRaw = typeof source.data === 'string' ? source.data : null;
  let embedded: Record<string, unknown> | null = null;

  if (embeddedRaw) {
    try {
      embedded = JSON.parse(embeddedRaw) as Record<string, unknown>;
    } catch {
      embedded = null;
    }
  }

  const root = embedded ?? source;
  const info = (root.info as Record<string, { value?: unknown }> | undefined) ?? {};
  const subInfo = (root.subInfo as Record<string, { value?: unknown }> | undefined) ?? {};
  const vitality = (root.vitality as Record<string, { value?: unknown }> | undefined) ?? {};
  const textBlocks = (root.text as Record<string, { value?: unknown }> | undefined) ?? {};
  const avatar = (root.avatar as Record<string, unknown> | undefined) ?? (source.avatar as Record<string, unknown> | undefined);
  const speed = Number((vitality['speed']?.value ?? readNestedNumber(raw, [['speed'], ['movement', 'walk']], 30)));
  const hp = Number(vitality['hp-current']?.value ?? readNestedNumber(raw, [['hp'], ['hitPoints', 'current'], ['health', 'current']], 10));
  const maxHp = Number(vitality['hp-max']?.value ?? readNestedNumber(raw, [['maxHp'], ['hitPoints', 'max'], ['health', 'max']], hp));

  const notesParts = [
    normalizeMultiline(readDocumentText(textBlocks.background?.value)),
    normalizeMultiline(readDocumentText(textBlocks.features?.value)),
  ].filter(Boolean);

  return {
    name: String((root.name as { value?: unknown } | undefined)?.value ?? readNestedString(raw, [['name'], ['characterName'], ['character', 'name']], 'Новый персонаж')),
    race: String(info.race?.value ?? readNestedString(raw, [['race'], ['ancestry'], ['species']], 'Не указано')),
    heroClass: String(info.charClass?.value ?? readNestedString(raw, [['class'], ['heroClass'], ['characterClass']], 'Adventurer')),
    subclass: String(info.charSubclass?.value ?? ''),
    background: String(info.background?.value ?? ''),
    alignment: String(info.alignment?.value ?? ''),
    playerName: String(info.playerName?.value ?? ''),
    level: Number(info.level?.value ?? readNestedNumber(raw, [['level'], ['character', 'level']], 1)),
    experience: Number(info.experience?.value ?? 0),
    hp,
    maxHp,
    ac: Number(vitality['ac']?.value ?? readNestedNumber(raw, [['ac'], ['armorClass']], 10)),
    speed,
    initiative: Number(vitality['initiative']?.value ?? 0),
    proficiencyBonus: Number(root.proficiency ?? 0),
    stats: extractStats(root.stats as Record<string, unknown> | undefined),
    age: String(subInfo.age?.value ?? ''),
    height: String(subInfo.height?.value ?? ''),
    weight: String(subInfo.weight?.value ?? ''),
    eyes: String(subInfo.eyes?.value ?? ''),
    skin: String(subInfo.skin?.value ?? ''),
    hair: String(subInfo.hair?.value ?? ''),
    avatarUrl: typeof avatar?.webp === 'string' ? avatar.webp : typeof avatar?.jpeg === 'string' ? avatar.jpeg : undefined,
    spells: normalizeMultiline(readDocumentText(textBlocks.traits?.value) || readNestedString(raw, [['spellsText'], ['spells']], '')),
    inventory: normalizeMultiline(readDocumentText(textBlocks.equipment?.value) || readNestedString(raw, [['inventoryText'], ['inventory'], ['equipment']], '')),
    notes: notesParts.join('\n\n') || readNestedString(raw, [['notes'], ['backstory'], ['description']], 'Импортировано из Long Story Short.'),
    appearance: normalizeMultiline(readDocumentText(textBlocks.appearance?.value)),
    personality: normalizeMultiline(readDocumentText(textBlocks.personality?.value)),
    ideals: normalizeMultiline(readDocumentText(textBlocks.ideals?.value)),
    bonds: normalizeMultiline(readDocumentText(textBlocks.bonds?.value)),
    flaws: normalizeMultiline(readDocumentText(textBlocks.flaws?.value)),
    allies: normalizeMultiline(readDocumentText(textBlocks.allies?.value)),
    proficiencies: normalizeMultiline(readDocumentText(textBlocks.prof?.value)),
    traits: normalizeMultiline(readDocumentText(textBlocks.traits?.value)),
    equipmentDetails: normalizeMultiline(readDocumentText(textBlocks.equipment?.value)),
    attacks: normalizeMultiline(readDocumentText(textBlocks.attacks?.value)),
    feats: normalizeMultiline(readDocumentText(textBlocks.feats?.value)),
    features: normalizeMultiline(readDocumentText(textBlocks.features?.value)),
  };
}

function getPlayerTokens(tokens: RoomToken[]) {
  return tokens.filter((token) => token.kind === 'player');
}

function isCellVisibleToPlayers(x: number, y: number, tokens: RoomToken[]) {
  const playerTokens = tokens.filter((token) => token.kind === 'player');
  return playerTokens.some((token) => {
    const radius = token.visionRadius ?? 3;
    return Math.abs(token.x - x) + Math.abs(token.y - y) <= radius;
  });
}

function getStorageKey(roomId: string) {
  return `${STORAGE_PREFIX}${roomId}`;
}

function buildSavedRoomState({
  mapName,
  mapState,
  savedMaps,
  activeSavedMapId,
  widgetUrl,
  tokens,
  sheets,
  journal,
}: SavedRoomState): SavedRoomState {
  return {
    mapName,
    mapState,
    savedMaps,
    activeSavedMapId,
    widgetUrl,
    tokens,
    sheets,
    journal,
  };
}

function resizeTiles(source: CellData[], oldCols: number, oldRows: number, newCols: number, newRows: number) {
  const nextTiles = createEmptyMap(newCols, newRows);

  for (let y = 0; y < Math.min(oldRows, newRows); y += 1) {
    for (let x = 0; x < Math.min(oldCols, newCols); x += 1) {
      nextTiles[getCellIndex(x, y, newCols)] = source[getCellIndex(x, y, oldCols)] ?? createCell();
    }
  }

  return nextTiles;
}

function boardButtonClass(isActive: boolean) {
  return `rounded-full border px-3 py-2 text-sm ${isActive ? 'border-fuchsia-400 bg-fuchsia-500/15 text-white' : 'border-white/10 text-slate-300'}`;
}

const statLabels: Array<{ key: keyof CharacterStats; label: string }> = [
  { key: 'str', label: 'СИЛ' },
  { key: 'dex', label: 'ЛОВ' },
  { key: 'con', label: 'ТЕЛ' },
  { key: 'int', label: 'ИНТ' },
  { key: 'wis', label: 'МДР' },
  { key: 'cha', label: 'ХАР' },
];

function createDefaultStats(): CharacterStats {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
}

function createEmptyCharacterSheet(id: string, tokenId: string, name: string): CharacterSheet {
  return {
    id,
    tokenId,
    name,
    race: 'Human',
    heroClass: 'Adventurer',
    level: 1,
    hp: 12,
    maxHp: 12,
    ac: 12,
    speed: 30,
    stats: createDefaultStats(),
    notes: 'Создано игроком в комнате.',
    inventory: '',
    spells: '',
  };
}

function characterSections(sheet: CharacterSheet) {
  return [
    { title: 'Описание', value: sheet.appearance },
    { title: 'Личность', value: sheet.personality },
    { title: 'Идеалы', value: sheet.ideals },
    { title: 'Привязанности', value: sheet.bonds },
    { title: 'Слабости', value: sheet.flaws },
    { title: 'Союзники и связи', value: sheet.allies },
    { title: 'Владения и языки', value: sheet.proficiencies },
    { title: 'Черты и формы', value: sheet.traits },
    { title: 'Снаряжение', value: sheet.equipmentDetails || sheet.inventory },
    { title: 'Атаки и расовые заметки', value: sheet.attacks },
    { title: 'Черты/feat', value: sheet.feats },
    { title: 'Особенности', value: sheet.features },
    { title: 'Заклинания', value: sheet.spells },
    { title: 'Инвентарь', value: sheet.inventory },
    { title: 'Заметки', value: sheet.notes },
  ].filter((section) => section.value);
}

function Board({
  title,
  subtitle,
  cols,
  rows,
  tiles,
  tokens,
  zoom,
  visibleMask,
  onBoardPointerDown,
  onTokenPointerDown,
}: {
  title: string;
  subtitle: string;
  cols: number;
  rows: number;
  tiles: CellData[];
  tokens: RoomToken[];
  zoom: number;
  visibleMask?: boolean[];
  onBoardPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTokenPointerDown?: (tokenId: string) => (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const aspectRatio = `${cols} / ${rows}`;
  const minWidth = Math.max(600, cols * 44);

  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <span className="badge">{cols}×{rows}</span>
      </div>

      <div className="overflow-auto rounded-2xl border border-white/10 bg-slate-950/70 p-3">
        <div
          onPointerDown={onBoardPointerDown}
          className="relative touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            aspectRatio,
            minWidth,
          }}
        >
          {Array.from({ length: cols * rows }, (_, index) => {
            const x = index % cols;
            const y = Math.floor(index / cols);
            const cell = tiles[index] ?? createCell();
            const isVisible = visibleMask ? visibleMask[index] : true;
            return (
              <div key={`${title}-${x}-${y}`} className="relative border border-white/10" style={{ backgroundColor: cell.terrain }}>
                {cell.texture ? <div className="absolute inset-[18%] rounded-md opacity-40" style={{ backgroundColor: cell.texture }} /> : null}
                {cell.obstacle ? <div className="absolute inset-x-[15%] bottom-[15%] top-[15%] rounded-md border-2 opacity-90" style={{ borderColor: cell.obstacle, backgroundColor: `${cell.obstacle}33` }} /> : null}
                {cell.furniture ? <div className="absolute inset-x-[20%] inset-y-[32%] rounded-sm" style={{ backgroundColor: cell.furniture }} /> : null}
                {cell.fog ? <div className="absolute inset-0 bg-slate-950/70" /> : null}
                {!isVisible ? <div className="absolute inset-0 bg-black" /> : null}
              </div>
            );
          })}

          {tokens.map((token) => {
            const left = `calc(${((token.x + 0.5) / cols) * 100}% - 1.5rem)`;
            const top = `calc(${((token.y + 0.5) / rows) * 100}% - 1.5rem)`;
            const style: CSSProperties = {
              left,
              top,
              borderColor: token.color,
              backgroundColor: `${token.color}33`,
              boxShadow: `0 0 24px ${token.color}55`,
            };
            const isHiddenByMask = visibleMask ? !visibleMask[getCellIndex(token.x, token.y, cols)] : false;
            if (isHiddenByMask) return null;
            return (
              <button
                key={token.id}
                onPointerDown={onTokenPointerDown ? onTokenPointerDown(token.id) : undefined}
                className="absolute flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-semibold text-white shadow-lg"
                style={style}
              >
                {token.short}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GameRoomPage({ roomId }: { roomId: string }) {
  const [roomPassword, setRoomPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [displayName, setDisplayName] = useState('Мастер Аркейн');
  const [role, setRole] = useState<RoomRole | null>(null);
  const [joinStep, setJoinStep] = useState<JoinStep>('auth');
  const [authError, setAuthError] = useState('');
  const [mapName, setMapName] = useState('Руины старой башни');
  const [mapState, setMapState] = useState<MapState>(createInitialMapState);
  const [savedMaps, setSavedMaps] = useState<SavedMapPreset[]>([]);
  const [activeSavedMapId, setActiveSavedMapId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<RoomToken[]>(initialTokens);
  const [sheets, setSheets] = useState<CharacterSheet[]>(initialSheets);
  const [selectedTokenId, setSelectedTokenId] = useState('elira');
  const [tool, setTool] = useState<DrawingTool>('move');
  const [selectedColor, setSelectedColor] = useState(layerPalette.terrain[1]);
  const [activeBoard, setActiveBoard] = useState<BoardKind>('public');
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [diceFormula, setDiceFormula] = useState('1d20+5');
  const [lootCrBand, setLootCrBand] = useState<LootCrBand>('0-4');
  const [lootResult, setLootResult] = useState<LootResult>(randomLootDefault);
  const [eventResult, setEventResult] = useState(randomEventPool[0]);
  const [zoom, setZoom] = useState(1);
  const [gridColsInput, setGridColsInput] = useState(String(DEFAULT_COLS));
  const [gridRowsInput, setGridRowsInput] = useState(String(DEFAULT_ROWS));
  const [mapPresetName, setMapPresetName] = useState('Сцена 1');
  const [widgetUrl, setWidgetUrl] = useState(DEFAULT_WIDGET_URL);
  const [journal, setJournal] = useState<JournalEntry[]>([
    {
      id: 'j1',
      type: 'system',
      text: 'Комната работает как обычная комната с паролем: первый вход становится мастером, остальные — игроками.',
      time: nowTime(),
    },
  ]);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);

  const cols = mapState.cols;
  const rows = mapState.rows;
  const activeTiles = activeBoard === 'public' ? mapState.publicTiles : mapState.gmTiles;

  const selectedToken = useMemo(
    () => tokens.find((token) => token.id === selectedTokenId) ?? tokens[0],
    [selectedTokenId, tokens],
  );
  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.tokenId === selectedToken?.id),
    [selectedToken?.id, sheets],
  );
  const playerTokens = useMemo(() => getPlayerTokens(tokens), [tokens]);
  const groupSheets = useMemo(
    () => sheets.filter((sheet) => playerTokens.some((token) => token.sheetId === sheet.id)),
    [playerTokens, sheets],
  );
  const canEditSheet = useCallback((sheet: CharacterSheet) => {
    if (role === 'gm') return true;
    if (role !== 'player') return false;
    const ownerToken = tokens.find((token) => token.sheetId === sheet.id);
    return ownerToken?.owner === displayName;
  }, [displayName, role, tokens]);
  const activePalette = useMemo(() => {
    const toolConfig = toolMeta.find((item) => item.value === tool);
    return toolConfig?.layer ? layerPalette[toolConfig.layer] : layerPalette.terrain;
  }, [tool]);

  const playerVisibilityMask = useMemo(
    () => Array.from({ length: cols * rows }, (_, index) => isCellVisibleToPlayers(index % cols, Math.floor(index / cols), tokens)),
    [cols, rows, tokens],
  );

  const visibleTokensForPlayers = useMemo(
    () => tokens.filter((token) => !token.gmOnly && playerVisibilityMask[getCellIndex(token.x, token.y, cols)]),
    [cols, playerVisibilityMask, tokens],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(getStorageKey(roomId));
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
      if (parsed.mapState?.cols && parsed.mapState?.rows && parsed.mapState.publicTiles && parsed.mapState.gmTiles) {
        setMapState(parsed.mapState as MapState);
        setGridColsInput(String(parsed.mapState.cols));
        setGridRowsInput(String(parsed.mapState.rows));
      }
      if (parsed.savedMaps) setSavedMaps(parsed.savedMaps);
      if (parsed.activeSavedMapId) setActiveSavedMapId(parsed.activeSavedMapId);
      if (parsed.widgetUrl) setWidgetUrl(parsed.widgetUrl);
      if (parsed.tokens) setTokens(parsed.tokens);
      if (parsed.sheets) setSheets(parsed.sheets);
      if (parsed.journal) setJournal(parsed.journal);
    } catch {
      // ignore corrupted local state
    }

    setIsLoadedFromStorage(true);
  }, [roomId]);

  useEffect(() => {
    if (!isLoadedFromStorage) return;
    const payload = buildSavedRoomState({ mapName, mapState, savedMaps, activeSavedMapId, widgetUrl, tokens, sheets, journal });
    window.localStorage.setItem(getStorageKey(roomId), JSON.stringify(payload));
  }, [activeSavedMapId, isLoadedFromStorage, journal, mapName, mapState, roomId, savedMaps, sheets, tokens, widgetUrl]);

  const addJournalEntry = (type: JournalEntry['type'], text: string) => {
    setJournal((current) => [{ id: `${Date.now()}-${Math.random()}`, type, text, time: nowTime() }, ...current].slice(0, 20));
  };

  const setTilesForBoard = useCallback((board: BoardKind, nextTiles: CellData[]) => {
    setMapState((current) => ({
      ...current,
      publicTiles: board === 'public' ? nextTiles : current.publicTiles,
      gmTiles: board === 'gm' ? nextTiles : current.gmTiles,
    }));
  }, []);

  const applyCellChange = useCallback((board: BoardKind, index: number, updater: (cell: CellData) => CellData) => {
    const sourceTiles = board === 'public' ? mapState.publicTiles : mapState.gmTiles;
    setTilesForBoard(board, sourceTiles.map((cell, cellIndex) => (cellIndex === index ? updater(cell) : cell)));
  }, [mapState.gmTiles, mapState.publicTiles, setTilesForBoard]);

  const paintCell = useCallback((x: number, y: number) => {
    const index = getCellIndex(x, y, cols);

    if (tool === 'terrain') {
      applyCellChange(activeBoard, index, (cell) => ({ ...cell, terrain: selectedColor }));
      return;
    }

    if (tool === 'obstacle') {
      applyCellChange(activeBoard, index, (cell) => ({ ...cell, obstacle: selectedColor }));
      return;
    }

    if (tool === 'texture') {
      applyCellChange(activeBoard, index, (cell) => ({ ...cell, texture: selectedColor }));
      return;
    }

    if (tool === 'furniture') {
      applyCellChange(activeBoard, index, (cell) => ({ ...cell, furniture: selectedColor }));
      return;
    }

    if (tool === 'fog') {
      applyCellChange(activeBoard, index, (cell) => ({ ...cell, fog: !cell.fog }));
      return;
    }

    if (tool === 'erase') {
      applyCellChange(activeBoard, index, () => createCell());
    }
  }, [activeBoard, applyCellChange, cols, selectedColor, tool]);

  const canMoveToken = useCallback((token: RoomToken) => {
    if (role === 'gm') return true;
    if (role !== 'player') return false;
    return token.roleOwner === 'player' && token.owner === displayName;
  }, [displayName, role]);

  const applyPointerToBoard = useCallback((clientX: number, clientY: number, board: BoardKind) => {
    const boardElement = document.getElementById(`battle-board-${board}`);
    if (!boardElement) return;

    const rect = boardElement.getBoundingClientRect();
    const x = clamp(Math.floor(((clientX - rect.left) / rect.width) * cols), 0, cols - 1);
    const y = clamp(Math.floor(((clientY - rect.top) / rect.height) * rows), 0, rows - 1);

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
  }, [canMoveToken, cols, draggingTokenId, paintCell, rows, selectedTokenId, tool]);

  useEffect(() => {
    if (!isPointerDown) return undefined;

    const handleMove = (event: PointerEvent) => {
      applyPointerToBoard(event.clientX, event.clientY, activeBoard);
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
  }, [activeBoard, applyPointerToBoard, draggingTokenId, isPointerDown, tokens]);

  const handleBoardPointerDown = (board: BoardKind) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joinStep !== 'ready') return;
    setActiveBoard(board);
    setIsPointerDown(true);
    applyPointerToBoard(event.clientX, event.clientY, board);
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

    const nextName = file.name.replace(/\.[^.]+$/, '');
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
        type: 'map' as const,
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
        tokens,
        sheets,
        journal: nextJournal,
        widgetUrl,
      });
      window.localStorage.setItem(getStorageKey(roomId), JSON.stringify(payload));
    }

    event.target.value = '';
  };

  const handleSaveMap = () => {
    const presetId = `map-${Date.now()}`;
    const nextPreset: SavedMapPreset = {
      id: presetId,
      name: mapPresetName.trim() || mapName || 'Новая сцена',
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
      tokens,
      sheets,
      journal,
      widgetUrl,
    });
    window.localStorage.setItem(getStorageKey(roomId), JSON.stringify(payload));
    addJournalEntry('save', `Карта «${nextPreset.name}» сохранена локально для комнаты ${roomId} как новая вкладка.`);
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
      tokens,
      sheets,
      journal,
      widgetUrl,
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(mapPresetName || mapName || roomId).replace(/[^a-zA-Zа-яА-Я0-9-_]+/g, '_')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    addJournalEntry('save', `Экспортирован JSON сцены «${mapPresetName || mapName}».`);
  };

  const handleImportMapJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as Partial<SavedRoomState>;
      if (!parsed.mapName || !parsed.mapState?.publicTiles || !parsed.mapState?.gmTiles) {
        addJournalEntry('system', `Файл ${file.name} не содержит валидную карту комнаты.`);
        return;
      }

      setMapName(parsed.mapName);
      setMapPresetName(parsed.mapName);
      setMapState(parsed.mapState);
      setGridColsInput(String(parsed.mapState.cols));
      setGridRowsInput(String(parsed.mapState.rows));
      setSavedMaps(parsed.savedMaps ?? []);
      setActiveSavedMapId(parsed.activeSavedMapId ?? null);
      setWidgetUrl(parsed.widgetUrl ?? DEFAULT_WIDGET_URL);
      if (parsed.tokens) setTokens(parsed.tokens);
      if (parsed.sheets) setSheets(parsed.sheets);
      if (parsed.journal) setJournal(parsed.journal);
      addJournalEntry('map', `JSON-карта «${file.name}» загружена в комнату.`);
    } catch {
      addJournalEntry('system', `Файл ${file.name} не является валидным JSON карты.`);
    } finally {
      event.target.value = '';
    }
  };

  const handleLoadSavedMap = (preset: SavedMapPreset) => {
    setActiveSavedMapId(preset.id);
    setMapPresetName(preset.name);
    setMapName(preset.mapName);
    setMapState(preset.mapState);
    setGridColsInput(String(preset.mapState.cols));
    setGridRowsInput(String(preset.mapState.rows));
    addJournalEntry('map', `Загружена сохранённая сцена «${preset.name}».`);
  };

  const handleDeleteSavedMap = (presetId: string) => {
    const presetIndex = savedMaps.findIndex((preset) => preset.id === presetId);
    if (presetIndex <= 0) return;

    const nextSavedMaps = savedMaps.filter((preset) => preset.id !== presetId);
    const fallbackPreset = nextSavedMaps[Math.max(0, presetIndex - 1)] ?? nextSavedMaps[0] ?? null;

    setSavedMaps(nextSavedMaps);

    if (activeSavedMapId === presetId) {
      if (fallbackPreset) {
        handleLoadSavedMap(fallbackPreset);
      } else {
        setActiveSavedMapId(null);
      }
    }

    addJournalEntry('map', 'Вкладка карты удалена.');
  };

  const handleResizeMap = () => {
    const nextCols = clamp(Number(gridColsInput) || DEFAULT_COLS, MIN_GRID, MAX_GRID);
    const nextRows = clamp(Number(gridRowsInput) || DEFAULT_ROWS, MIN_GRID, MAX_GRID);

    setMapState((current) => ({
      cols: nextCols,
      rows: nextRows,
      publicTiles: resizeTiles(current.publicTiles, current.cols, current.rows, nextCols, nextRows),
      gmTiles: resizeTiles(current.gmTiles, current.cols, current.rows, nextCols, nextRows),
    }));

    setTokens((current) =>
      current.map((token) => ({
        ...token,
        x: clamp(token.x, 0, nextCols - 1),
        y: clamp(token.y, 0, nextRows - 1),
      })),
    );

    addJournalEntry('map', `Размер карты изменён на ${nextCols}×${nextRows}.`);
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
    const nextLoot = rollTreasureFromTables(lootCrBand);
    setLootResult(nextLoot);
    addJournalEntry('loot', `Лут из таблицы dnd.su (${lootCrBand}): ${nextLoot.details} Ссылка: ${nextLoot.link}`);
  };

  const handleRandomEvent = () => {
    const nextEvent = randomEventPool[Math.floor(Math.random() * randomEventPool.length)];
    setEventResult(nextEvent);
    addJournalEntry('event', `Событие из dnd.su: ${nextEvent.title}. Ссылка: ${nextEvent.link}`);
  };

  const handleSheetChange = <K extends keyof CharacterSheet>(key: K, value: CharacterSheet[K]) => {
    if (!selectedSheet || !canEditSheet(selectedSheet)) return;

    setSheets((current) => current.map((sheet) => (sheet.id === selectedSheet.id ? { ...sheet, [key]: value } : sheet)));

    if (key === 'hp' || key === 'maxHp' || key === 'ac' || key === 'speed' || key === 'name') {
      setTokens((current) =>
        current.map((token) => {
          if (token.sheetId !== selectedSheet.id) return token;

          return {
            ...token,
            name: key === 'name' ? String(value) : token.name,
            short: key === 'name' ? getTokenInitial(String(value)) : token.short,
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
    const name = displayName || `Игрок ${nextIndex}`;

    const nextToken: RoomToken = {
      id: tokenId,
      name,
      short: getTokenInitial(name),
      kind: 'player',
      color: 'rgb(96 165 250)',
      x: clamp(1 + (nextIndex % 4), 0, cols - 1),
      y: clamp(1 + (nextIndex % 5), 0, rows - 1),
      hp: 12,
      maxHp: 12,
      ac: 12,
      speed: 30,
      owner: displayName,
      roleOwner: 'player',
      sheetId,
      visionRadius: 3,
    };

    const nextSheet: CharacterSheet = createEmptyCharacterSheet(sheetId, tokenId, name);

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
        x: clamp(1 + (nextIndex % 4), 0, cols - 1),
        y: clamp(1 + (nextIndex % 5), 0, rows - 1),
        hp,
        maxHp,
        ac,
        speed,
        owner: displayName,
        roleOwner: 'player',
        sheetId,
        visionRadius: 3,
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

  const handleTokenSetting = (tokenId: string, key: 'gmOnly' | 'visionRadius', value: boolean | number) => {
    if (role !== 'gm') return;
    setTokens((current) =>
      current.map((token) =>
        token.id === tokenId
          ? {
              ...token,
              [key]: key === 'visionRadius' ? Number(value) : value,
            }
          : token,
      ),
    );
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSheet || !canEditSheet(selectedSheet)) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setSheets((current) => current.map((sheet) => (sheet.id === selectedSheet.id ? { ...sheet, avatarUrl: result } : sheet)));
      addJournalEntry('sheet', `Для персонажа ${selectedSheet.name} загружен портрет.`);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const paintedCells = activeTiles.filter((tile) => tile.terrain !== DEFAULT_TERRAIN).length;
  const foggedCells = activeTiles.filter((tile) => tile.fog).length;
  const obstacleCells = activeTiles.filter((tile) => tile.obstacle).length;
  const textureCells = activeTiles.filter((tile) => tile.texture).length;
  const furnitureCells = activeTiles.filter((tile) => tile.furniture).length;

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
        <header className="card flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm text-slate-400">Комната / {roomId}</div>
            <h1 className="text-2xl font-semibold text-white">Комната мастера с двумя картами и видимостью игроков</h1>
            <p className="mt-1 text-sm text-slate-400">
              Мастер видит игровую карту и скрытую карту для тумана войны, НПС и секретов. Лут и события теперь ведут на конкретные ссылки dnd.su, а карта сохраняется локально в браузере.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
              На главную
            </Link>
            {role !== 'player' || joinStep !== 'ready' ? (
              <>
                <label className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
                  Загрузить карту
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadMap} />
                </label>
                <label className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
                  Загрузить JSON
                  <input type="file" accept="application/json" className="hidden" onChange={handleImportMapJson} />
                </label>
                <button onClick={handleExportMapJson} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">
                  Сохранить JSON
                </button>
              </>
            ) : null}
          </div>
        </header>

        {role !== 'player' || joinStep !== 'ready' ? (
          <section className="card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm text-slate-400">Сохранённые сцены</div>
                <div className="mt-1 text-sm text-slate-300">Каждая вкладка хранит пару карт: публичную для игроков и скрытую для мастера. При переключении меняются обе карты сразу.</div>
              </div>
              <div className="flex w-full max-w-xl gap-2">
                <input
                  value={mapPresetName}
                  onChange={(event) => setMapPresetName(event.target.value)}
                  placeholder="Название вкладки карты"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                />
                <button onClick={handleSaveMap} className="rounded-full bg-emerald-500 px-4 py-3 text-sm font-medium text-slate-950">
                  Сохранить как вкладку
                </button>
                <button onClick={handleExportMapJson} className="rounded-full border border-white/10 px-4 py-3 text-sm font-medium text-slate-200">
                  Экспорт JSON
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {savedMaps.length ? (
                savedMaps.map((preset, index) => (
                  <div key={preset.id} className="flex items-center gap-2">
                    <button onClick={() => handleLoadSavedMap(preset)} className={boardButtonClass(activeSavedMapId === preset.id)}>
                      {preset.name}
                    </button>
                    {index > 0 ? (
                      <button onClick={() => handleDeleteSavedMap(preset.id)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-rose-300" aria-label={`Удалить вкладку ${preset.name}`}>
                        ×
                      </button>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400">Пока нет сохранённых вкладок. Сохраните текущую сцену, чтобы быстро переключаться между наборами карт.</div>
              )}
            </div>
          </section>
        ) : null}

        {joinStep !== 'ready' ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="card p-6">
              <span className="badge">Вход</span>
              <h2 className="mt-4 text-2xl font-semibold text-white">Одна комната, один пароль, две роли</h2>
              <p className="mt-3 text-sm text-slate-300">
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
                      <div className="mt-1">Задаёт размер карты, сохраняет карту, настраивает обзор игроков, управляет публичной и скрытой картой отдельно.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 px-4 py-3">
                      <div className="font-medium text-white">Игрок</div>
                      <div className="mt-1">Заходит по тому же паролю, импортирует лист или заполняет его вручную, затем управляет только своим токеном.</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : null}

        <section className={`grid gap-4 md:grid-cols-2 ${role === 'gm' ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Карта</div>
            <div className="mt-2 text-xl font-semibold text-white">{mapName}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Роль</div>
            <div className="mt-2 text-xl font-semibold text-white">{role === 'gm' ? 'Мастер' : role === 'player' ? 'Игрок' : 'Не выбрана'}</div>
          </div>
          {role === 'gm' ? (
            <div className="card p-4">
              <div className="text-sm text-slate-400">Пароль комнаты</div>
              <div className="mt-2 text-xl font-semibold text-white">{roomPassword ? '••••••••' : 'Не задан'}</div>
            </div>
          ) : null}
          <div className="card p-4">
            <div className="text-sm text-slate-400">Активный токен</div>
            <div className="mt-2 text-xl font-semibold text-white">{selectedToken?.name ?? '—'}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-400">Масштаб карты</div>
            <div className="mt-2 text-xl font-semibold text-white">{Math.round(zoom * 100)}%</div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {role === 'gm' ? (
              <div className="space-y-4">
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Админ-панель мастера</h2>
                    <span className="badge">master only</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <button className={boardButtonClass(activeBoard === 'public')} onClick={() => setActiveBoard('public')}>
                      Публичная карта
                    </button>
                    <button className={boardButtonClass(activeBoard === 'gm')} onClick={() => setActiveBoard('gm')}>
                      Скрытая карта мастера
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {toolMeta.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => {
                          setTool(item.value);
                          if (item.layer) setSelectedColor(layerPalette[item.layer][0]);
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
                  <div className="mt-4 rounded-2xl border border-white/10 p-3 text-sm text-slate-300">
                    <div className="mb-3 text-xs uppercase tracking-wide text-slate-400">Размер поля</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={gridColsInput} onChange={(event) => setGridColsInput(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white" placeholder="Колонки" />
                      <input value={gridRowsInput} onChange={(event) => setGridRowsInput(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white" placeholder="Строки" />
                    </div>
                    <button onClick={handleResizeMap} className="mt-3 w-full rounded-full bg-cyan-500 px-4 py-3 font-medium text-slate-950">
                      Применить размер
                    </button>
                    <div className="mt-2 text-xs text-slate-400">Любой формат в диапазоне от {MIN_GRID}×{MIN_GRID} до {MAX_GRID}×{MAX_GRID}.</div>
                  </div>
                  <button
                    onClick={() => {
                      setTilesForBoard(activeBoard, createEmptyMap(cols, rows));
                      addJournalEntry('map', `Карта ${activeBoard === 'public' ? 'игроков' : 'мастера'} очищена до базовой сетки.`);
                    }}
                    className="mt-4 w-full rounded-full border border-white/10 px-4 py-3 text-sm text-slate-200"
                  >
                    Очистить активную карту
                  </button>
                </div>

                <div className="card p-4">
                  <h2 className="text-lg font-semibold text-white">Токены</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    {tokens.map((token) => (
                      <div key={token.id} className={`rounded-2xl border px-3 py-3 ${selectedTokenId === token.id ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/8'}`}>
                        <button onClick={() => setSelectedTokenId(token.id)} className="w-full text-left">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium text-white">{token.name}</div>
                              <div className="text-slate-400">{token.kind} • {cellCoordinate(token.x, token.y)}</div>
                            </div>
                            <span className="text-xs text-slate-300">HP {token.hp}/{token.maxHp}</span>
                          </div>
                        </button>
                        <div className="mt-3 grid gap-2 text-xs text-slate-300">
                          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
                            <span>Скрыт от игроков</span>
                            <input type="checkbox" checked={Boolean(token.gmOnly)} onChange={(event) => handleTokenSetting(token.id, 'gmOnly', event.target.checked)} />
                          </label>
                          {token.kind === 'player' ? (
                            <label className="rounded-xl border border-white/10 px-3 py-2">
                              <div className="mb-2">Обзор игрока: {token.visionRadius ?? 3} клетки</div>
                              <input type="range" min="1" max="8" value={token.visionRadius ?? 3} onChange={(event) => handleTokenSetting(token.id, 'visionRadius', Number(event.target.value))} className="w-full" />
                            </label>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-4 xl:col-span-1">
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Панель персонажей группы</h2>
                    <p className="mt-1 text-sm text-slate-400">Отдельно от админки: и игроки, и мастер могут загружать и просматривать карточки всей группы.</p>
                  </div>
                  <span className="badge">party roster</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={createPlayerCharacter} className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-white">
                    Добавить пустую карточку
                  </button>
                  <label className="cursor-pointer rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-white">
                    Импортировать JSON персонажа
                    <input type="file" accept="application/json" className="hidden" onChange={handleImportCharacterJson} />
                  </label>
                  <label className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${selectedSheet && canEditSheet(selectedSheet) ? 'border-white/10 text-slate-200' : 'border-white/5 text-slate-500'}`}>
                    Загрузить фото персонажа
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={!selectedSheet || !canEditSheet(selectedSheet)} />
                  </label>
                </div>
                <div className="mt-2 text-xs text-slate-400">Поддержан JSON в формате longstoryshort.app, включая вложенный блок `data`, характеристики, биографию, черты, инвентарь и ссылки на аватар.</div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[280px,1fr]">
                  <div className="space-y-3">
                    {groupSheets.map((sheet) => {
                      const token = tokens.find((item) => item.sheetId === sheet.id);
                      const isActive = selectedSheet?.id === sheet.id;
                      return (
                        <button
                          key={sheet.id}
                          onClick={() => setSelectedTokenId(token?.id ?? selectedTokenId)}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left ${isActive ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/8 bg-slate-950/40'}`}
                        >
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-lg font-semibold text-white">
                            {sheet.avatarUrl ? <img src={sheet.avatarUrl} alt={sheet.name} className="h-full w-full object-cover" /> : <span>{getTokenInitial(sheet.name)}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-white">{sheet.name}</div>
                            <div className="truncate text-xs text-slate-400">{sheet.race} • {sheet.heroClass} • ур. {sheet.level}</div>
                            <div className="mt-1 text-xs text-slate-500">HP {sheet.hp}/{sheet.maxHp} • AC {sheet.ac} • {token ? cellCoordinate(token.x, token.y) : 'без токена'}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    {selectedSheet ? (
                      <div className="space-y-4 text-sm text-slate-200">
                        <div className="grid gap-4 lg:grid-cols-[200px,1fr]">
                          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
                            <div className="flex aspect-[4/5] items-center justify-center bg-slate-900 text-4xl font-semibold text-white">
                              {selectedSheet.avatarUrl ? <img src={selectedSheet.avatarUrl} alt={selectedSheet.name} className="h-full w-full object-cover" /> : <span>{getTokenInitial(selectedSheet.name)}</span>}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <input value={selectedSheet.name} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('name', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" />
                            <div className="grid gap-2 md:grid-cols-2">
                              <input value={selectedSheet.race} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('race', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" />
                              <input value={selectedSheet.heroClass} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('heroClass', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" />
                              <input value={selectedSheet.subclass ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('subclass', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Подкласс" />
                              <input value={selectedSheet.background ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('background', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Предыстория" />
                            </div>
                            <div className="grid gap-2 md:grid-cols-4">
                              <input type="number" disabled={!canEditSheet(selectedSheet)} value={selectedSheet.level} onChange={(event) => handleSheetChange('level', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" />
                              <input type="number" disabled={!canEditSheet(selectedSheet)} value={selectedSheet.hp} onChange={(event) => handleSheetChange('hp', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" />
                              <input type="number" disabled={!canEditSheet(selectedSheet)} value={selectedSheet.maxHp} onChange={(event) => handleSheetChange('maxHp', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" />
                              <input type="number" disabled={!canEditSheet(selectedSheet)} value={selectedSheet.ac} onChange={(event) => handleSheetChange('ac', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" />
                            </div>
                            <div className="grid gap-2 md:grid-cols-4">
                              <input type="number" disabled={!canEditSheet(selectedSheet)} value={selectedSheet.speed} onChange={(event) => handleSheetChange('speed', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" placeholder="Скорость" />
                              <input value={selectedSheet.alignment ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('alignment', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" placeholder="Мировоззрение" />
                              <input value={selectedSheet.playerName ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('playerName', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" placeholder="Игрок" />
                              <input type="number" value={selectedSheet.experience ?? 0} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('experience', Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 disabled:opacity-60" placeholder="XP" />
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-6">
                          {statLabels.map((stat) => (
                            <div key={stat.key} className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-3 text-center">
                              <div className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</div>
                              <div className="mt-2 text-xl font-semibold text-white">{selectedSheet.stats[stat.key]}</div>
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-2 md:grid-cols-3">
                          <input value={selectedSheet.age ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('age', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Возраст" />
                          <input value={selectedSheet.height ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('height', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Рост" />
                          <input value={selectedSheet.weight ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('weight', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Вес" />
                          <input value={selectedSheet.eyes ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('eyes', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Глаза" />
                          <input value={selectedSheet.skin ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('skin', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Кожа" />
                          <input value={selectedSheet.hair ?? ''} disabled={!canEditSheet(selectedSheet)} onChange={(event) => handleSheetChange('hair', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 disabled:opacity-60" placeholder="Волосы" />
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          {characterSections(selectedSheet).map((section) => (
                            <div key={section.title} className="rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-4">
                              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">{section.title}</div>
                              <div className="whitespace-pre-wrap text-slate-200">{section.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/8 px-4 py-3 text-sm text-slate-300">Выберите персонажа слева.</div>
                    )}
                  </div>
                </div>
              </div>

              {role === 'gm' ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Инструменты мастера</h2>
                        <span className="badge">dnd.su only</span>
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <div className="rounded-2xl border border-white/8 px-4 py-3">
                          <div className="font-medium text-white">Последний лут</div>
                          <div className="mt-1">{lootResult.name}</div>
                          <div className="mt-1 text-slate-400">{lootResult.details}</div>
                          {lootResult.rolledMagicItems?.length ? (
                            <div className="mt-3 space-y-2">
                              <div className="text-xs uppercase tracking-wide text-slate-500">Выпавшие магические предметы</div>
                              {lootResult.rolledMagicItems.map((item, index) => (
                                <a key={`${item.table}-${item.roll}-${index}-${item.name}`} className="block text-cyan-300 underline underline-offset-4" href={item.link} target="_blank" rel="noreferrer">
                                  Таблица {item.table}, бросок {String(item.roll).padStart(2, '0')}: {item.name}
                                </a>
                              ))}
                            </div>
                          ) : null}
                          <a className="mt-2 inline-flex break-all text-cyan-300 underline" href={lootResult.link} target="_blank" rel="noreferrer">{lootResult.link}</a>
                        </div>
                        <label className="block rounded-2xl border border-white/8 px-4 py-3">
                          <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Таблица сокровищ dnd.su</div>
                          <select value={lootCrBand} onChange={(event) => setLootCrBand(event.target.value as LootCrBand)} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white">
                            <option value="0-4">Показатель опасности 0–4</option>
                            <option value="5-10">Показатель опасности 5–10</option>
                            <option value="11-16">Показатель опасности 11–16</option>
                            <option value="17+">Показатель опасности 17+</option>
                          </select>
                        </label>
                        <button onClick={handleRandomLoot} className="w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950">Сгенерировать лут из таблицы</button>
                        <div className="rounded-2xl border border-white/8 px-4 py-3">
                          <div className="font-medium text-white">Последнее событие</div>
                          <div className="mt-1">{eventResult.title}</div>
                          <div className="mt-1 text-slate-400">{eventResult.description}</div>
                          <a className="mt-2 inline-flex break-all text-cyan-300 underline" href={eventResult.link} target="_blank" rel="noreferrer">{eventResult.link}</a>
                        </div>
                        <button onClick={handleRandomEvent} className="w-full rounded-full bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white">Случайное событие</button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="card p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="text-lg font-semibold text-white">Чат / заметка</h2>
                          <span className="text-sm text-slate-400">локально в журнал</span>
                        </div>
                        <div className="flex gap-2">
                          <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Например: Борин идёт к двери" className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                          <button onClick={handleSendChat} className="rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white">Отправить</button>
                        </div>
                      </div>

                      <div className="card p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="text-lg font-semibold text-white">Кубы</h2>
                          <span className="text-sm text-slate-400">NdM±K</span>
                        </div>
                        <div className="flex gap-2">
                          <input value={diceFormula} onChange={(event) => setDiceFormula(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none" />
                          <button onClick={handleRoll} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-slate-950">Roll</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white">Журнал действий</h2>
                      <span className="badge">последние 20 событий</span>
                    </div>
                    <div className="space-y-3 text-sm">
                      {journal.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-white/8 px-4 py-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{entry.type}</span>
                            <span>{entry.time}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-slate-200">{entry.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white">Виджет местности</h2>
                      <span className="badge">regional map</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">Сюда можно подставить внешний URL с региональной картой. Для удобства я сразу поставил Waterdeep с tychmaps.com.</p>
                    <div className="mt-4 flex flex-col gap-3">
                      <input value={widgetUrl} onChange={(event) => setWidgetUrl(event.target.value)} placeholder="https://tychmaps.com/waterdeep/" className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white" />
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
                        <iframe title="Внешняя региональная карта" src={widgetUrl} className="h-[320px] w-full" />
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">Если конкретный сайт запрещает открытие внутри iframe, карта не покажется внутри виджета — в таком случае откройте её отдельно: <a href={widgetUrl} target="_blank" rel="noreferrer" className="text-emerald-300 underline underline-offset-4">открыть карту в новой вкладке</a>.</div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="card flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-slate-200">
            <span className="badge">Инструмент: {tool}</span>
            <span className="badge">Редактируется: {activeBoard === 'public' ? 'публичная карта' : 'скрытая карта'}</span>
            <span className="badge">Видимость игроков: {playerTokens.map((token) => `${token.name} ${token.visionRadius ?? 3}`).join(' • ') || 'нет'}</span>
          </div>

          {role === 'gm' ? (
            <div className="space-y-4">
              <div id="battle-board-public">
                <Board
                  title="Публичная карта"
                  subtitle="То, что увидят игроки с учётом публичных слоёв, fog of war и радиуса обзора игроков."
                  cols={cols}
                  rows={rows}
                  tiles={mapState.publicTiles}
                  tokens={visibleTokensForPlayers}
                  visibleMask={playerVisibilityMask}
                  zoom={zoom}
                  onBoardPointerDown={handleBoardPointerDown('public')}
                  onTokenPointerDown={handleTokenPointerDown}
                />
              </div>
              <div id="battle-board-gm">
                <Board
                  title="Скрытая карта мастера"
                  subtitle="Здесь мастер держит НПС, ловушки, тайники и будущие сцены до их открытия игрокам."
                  cols={cols}
                  rows={rows}
                  tiles={mapState.gmTiles}
                  tokens={tokens}
                  zoom={zoom}
                  onBoardPointerDown={handleBoardPointerDown('gm')}
                  onTokenPointerDown={handleTokenPointerDown}
                />
              </div>
            </div>
          ) : (
            <div id="battle-board-public">
              <Board
                title="Игровое поле"
                subtitle="Игрок видит только публичную карту и только те клетки, которые открывает обзор персонажей."
                cols={cols}
                rows={rows}
                tiles={mapState.publicTiles}
                tokens={visibleTokensForPlayers}
                visibleMask={playerVisibilityMask}
                zoom={zoom}
                onBoardPointerDown={handleBoardPointerDown('public')}
                onTokenPointerDown={handleTokenPointerDown}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
