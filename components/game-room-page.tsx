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
};

type SavedRoomState = {
  mapName: string;
  mapState: MapState;
  savedMaps?: SavedMapPreset[];
  activeSavedMapId?: string | null;
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
  details: 'Лут генерируется по таблицам статьи “Сокровищница”: индивидуальные монеты, сокровищница по ПО, драгоценности/искусство и ссылки на магические таблицы.',
  link: treasuryArticleLink,
};

const magicItemTables: Record<string, string[]> = {
  А: ['Зелье лечения', 'Свиток заклинания (1-й уровень)', 'Зелье лазания', 'Сумка хранения', 'Друидский талисман +1'],
  Б: ['Зелье большого лечения', 'Патроны +1', 'Свиток заклинания (2-й уровень)', 'Амулет защиты от обнаружения', 'Верёвка лазания'],
  В: ['Зелье превосходного лечения', 'Свиток заклинания (3-й уровень)', 'Оружие +1', 'Щит +1', 'Плащ защиты'],
  Г: ['Свиток заклинания (4-й уровень)', 'Жезл хранителя договоров +1', 'Доспех +1', 'Жезл боевого мага +1', 'Плащ смещения'],
  Д: ['Свиток заклинания (5-й уровень)', 'Оружие +2', 'Щит +2', 'Кольцо защиты', 'Посох силы'],
  Е: ['Свиток заклинания (6-й уровень)', 'Зелье высшего лечения', 'Сапоги скорости', 'Кольцо сопротивления', 'Жезл боевого мага +2'],
  Ё: ['Свиток заклинания (7-й уровень)', 'Оружие +3', 'Пояс силы великана', 'Кольцо телекинеза', 'Посох исцеления'],
  Ж: ['Свиток заклинания (8-й уровень)', 'Броня +3', 'Посох грома и молний', 'Меч возмездия', 'Ковер-самолёт'],
  З: ['Свиток заклинания (9-й уровень)', 'Священный мститель', 'Кольцо трёх желаний', 'Посох волшебства', 'Том ясной мысли'],
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

function rollMagicFromReference(reference: string) {
  const normalized = reference.replace('таблицы', 'таблица').replace('таблицу', 'таблица');
  const parts = normalized.split(' и ').map((part) => part.trim());
  const results: string[] = [];

  for (const part of parts) {
    const match = part.match(/(?:(\d+к\d+)|(\d+))\s+предмет(?:ов)?\s+из\s+таблица\s+([А-ЗЁ])/i) ?? part.match(/(?:(\d+к\d+)|(\d+))\s+предмет(?:ов)?\s+из\s+таблицы\s+([А-ЗЁ])/i);
    if (!match) continue;

    const count = match[1] ? rollDiceExpression(match[1]) : Number(match[2] || 1);
    const letter = match[3].toUpperCase();
    const pool = magicItemTables[letter] ?? [];

    for (let index = 0; index < count; index += 1) {
      if (!pool.length) continue;
      const item = pool[Math.floor(Math.random() * pool.length)];
      results.push(`${letter}: ${item}`);
    }
  }

  return results;
}

function rollTreasureFromTables(crBand: LootCrBand): LootResult {
  const d100 = rollDie(100);
  const individualCoins = treasureCoinTables[crBand].find((entry) => d100 >= entry.range[0] && d100 <= entry.range[1]) ?? treasureCoinTables[crBand][0];
  const hoardRow = hoardTables[crBand].find((entry) => d100 >= entry.range[0] && d100 <= entry.range[1]) ?? hoardTables[crBand][0];
  const gemMatch = hoardRow.treasure.match(/драгоценных камней стоимостью (\d+) зм/);
  const gemValue = gemMatch ? Number(gemMatch[1]) : null;
  const gemBucket = gemValue ? gemTables.find((entry) => entry.value === gemValue) ?? null : null;
  const gemItem = gemBucket ? gemBucket.items[Math.floor(Math.random() * gemBucket.items.length)] : null;
  const magicItems = hoardRow.magic ? rollMagicFromReference(hoardRow.magic) : [];

  return {
    name: `Клад по таблице ПО ${crBand}`,
    details: [
      `Бросок к100: ${d100}.`,
      `Монеты сокровищницы: ${hoardCoinTables[crBand].join(', ')}.`,
      `Индивидуальные монеты для этой же группы ПО: ${individualCoins.coins.join(', ')}.`,
      `Строка сокровищницы: ${hoardRow.treasure}`,
      hoardRow.magic ? `Магические предметы: ${hoardRow.magic}` : 'Магические предметы: без дополнительных бросков.',
      magicItems.length ? `Результат по таблицам А–З: ${magicItems.join('; ')}.` : '',
      gemBucket && gemItem ? `Пример камня из соответствующей таблицы: ${gemItem} (${gemBucket.value} зм).` : '',
      'Источник: таблицы статьи “Сокровищница” на dnd.su.',
    ].join(' '),
    link: treasuryArticleLink,
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
    const payload: SavedRoomState = { mapName, mapState, savedMaps, activeSavedMapId, tokens, sheets, journal };
    window.localStorage.setItem(getStorageKey(roomId), JSON.stringify(payload));
  }, [activeSavedMapId, isLoadedFromStorage, journal, mapName, mapState, roomId, savedMaps, sheets, tokens]);

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

    setMapName(file.name.replace(/\.[^.]+$/, ''));
    setMapPresetName(file.name.replace(/\.[^.]+$/, ''));
    addJournalEntry('map', `Загружена карта «${file.name}».`);
  };

  const handleSaveMap = () => {
    const presetId = activeSavedMapId ?? `map-${Date.now()}`;
    const nextPreset: SavedMapPreset = {
      id: presetId,
      name: mapPresetName.trim() || mapName || 'Новая сцена',
      mapName,
      mapState,
    };

    setSavedMaps((current) => {
      const existing = current.some((preset) => preset.id === presetId);
      return existing ? current.map((preset) => (preset.id === presetId ? nextPreset : preset)) : [...current, nextPreset];
    });
    setActiveSavedMapId(presetId);

    const payload: SavedRoomState = { mapName, mapState, savedMaps, activeSavedMapId: presetId, tokens, sheets, journal };
    window.localStorage.setItem(getStorageKey(roomId), JSON.stringify(payload));
    addJournalEntry('save', `Карта «${nextPreset.name}» сохранена локально для комнаты ${roomId}.`);
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
    if (!selectedSheet || role !== 'player') return;

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
            <label className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
              Загрузить карту
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadMap} />
            </label>
            <button onClick={handleSaveMap} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">
              Сохранить карту
            </button>
          </div>
        </header>

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
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {savedMaps.length ? (
              savedMaps.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleLoadSavedMap(preset)}
                  className={boardButtonClass(activeSavedMapId === preset.id)}
                >
                  {preset.name}
                </button>
              ))
            ) : (
              <div className="text-sm text-slate-400">Пока нет сохранённых вкладок. Сохраните текущую сцену, чтобы быстро переключаться между наборами карт.</div>
            )}
          </div>
        </section>

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

        <section className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Инструменты карты</h2>
                  <span className="badge">master map kit</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <button className={boardButtonClass(activeBoard === 'public')} onClick={() => setActiveBoard('public')}>
                    Публичная карта
                  </button>
                  {role === 'gm' ? (
                    <button className={boardButtonClass(activeBoard === 'gm')} onClick={() => setActiveBoard('gm')}>
                      Скрытая карта мастера
                    </button>
                  ) : null}
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
                {role === 'gm' ? (
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
                ) : null}
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
                      {role === 'gm' ? (
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
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
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
                      <div className="mt-1 text-slate-400">{lootResult.details}</div>
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
                    <button onClick={handleRandomLoot} className="w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950">
                      Сгенерировать лут из таблицы
                    </button>
                    <div className="rounded-2xl border border-white/8 px-4 py-3">
                      <div className="font-medium text-white">Последнее событие</div>
                      <div className="mt-1">{eventResult.title}</div>
                      <div className="mt-1 text-slate-400">{eventResult.description}</div>
                      <a className="mt-2 inline-flex break-all text-cyan-300 underline" href={eventResult.link} target="_blank" rel="noreferrer">{eventResult.link}</a>
                    </div>
                    <button onClick={handleRandomEvent} className="w-full rounded-full bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white">
                      Случайное событие
                    </button>
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
