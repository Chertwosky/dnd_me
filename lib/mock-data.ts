export const productHighlights = [
  'Комнаты по invite-ссылке с ролями мастер / игрок / наблюдатель и статусами участников',
  'Игровое поле с картой, сеткой, токенами, измерением, fog of war и инициативой',
  'Карточки персонажей, чат, броски кубов и журнал синхронизированных действий',
  'Инструменты мастера: генератор лута, случайные события, NPC и встроенная база знаний',
];

export const roadmap = [
  {
    title: 'Этап 1',
    items: ['Авторизация', 'Комнаты', 'Загрузка карты', 'Токены', 'Realtime-перемещение'],
  },
  {
    title: 'Этап 2',
    items: ['Карточки персонажей', 'Чат', 'Кубы'],
  },
  {
    title: 'Этап 3',
    items: ['Лут', 'События', 'Журнал сессии'],
  },
  {
    title: 'Этап 4',
    items: ['Fog of war', 'Инициатива', 'NPC/монстры', 'Поиск по базе знаний'],
  },
];

export const phaseChecklist = [
  {
    title: 'Этап 1 · Foundation',
    status: 'implemented',
    summary: 'Комната создана, invite-код активен, карта загружена, токены синхронизируются между участниками.',
    items: [
      { label: 'Magic-link / OAuth entrypoint', done: true },
      { label: 'Invite-ссылка и лобби комнаты', done: true },
      { label: 'Battle map + базовая сетка', done: true },
      { label: 'Права на перемещение токенов', done: true },
    ],
  },
  {
    title: 'Этап 2 · Character play',
    status: 'implemented',
    summary: 'Игроки открывают листы персонажей, общаются в чате и используют текстовые команды для бросков.',
    items: [
      { label: 'Карточки персонажей и owner access', done: true },
      { label: 'Комнатный чат и лог сообщений', done: true },
      { label: 'Команда /roll и d20/d100 броски', done: true },
    ],
  },
  {
    title: 'Этап 3 · GM toolkit',
    status: 'implemented',
    summary: 'Мастер генерирует лут, запускает события сцены и видит единый журнал сессии.',
    items: [
      { label: 'Пользовательские таблицы лута', done: true },
      { label: 'Случайные события по сценам', done: true },
      { label: 'Журнал боевых и narrative действий', done: true },
    ],
  },
  {
    title: 'Этап 4 · Advanced room UX',
    status: 'implemented',
    summary: 'В комнате доступны fog of war, инициатива, отдельные NPC/монстры и внутренняя справка.',
    items: [
      { label: 'Fog of war overlays', done: true },
      { label: 'Панель инициативы', done: true },
      { label: 'Бестиарий / NPC slots', done: true },
      { label: 'Поиск по базе знаний', done: true },
    ],
  },
];

export const roomMembers = [
  { name: 'Элира', role: 'Игрок', status: 'online', character: 'Wizard 4', color: 'cyan' },
  { name: 'Борин', role: 'Игрок', status: 'online', character: 'Fighter 4', color: 'amber' },
  { name: 'Мастер Аркейн', role: 'Мастер', status: 'host', character: 'GM', color: 'fuchsia' },
  { name: 'Лира', role: 'Наблюдатель', status: 'idle', character: 'Spectator', color: 'slate' },
];

export const tokens = [
  { name: 'Элира', hp: '28/32', ac: 15, owner: 'Игрок', x: 'B4', type: 'player', movement: '30 ft', initiative: 18 },
  { name: 'Борин', hp: '41/41', ac: 18, owner: 'Игрок', x: 'C5', type: 'player', movement: '25 ft', initiative: 14 },
  { name: 'Гоблин-разведчик', hp: '7/7', ac: 13, owner: 'NPC', x: 'G4', type: 'monster', movement: '30 ft', initiative: 12 },
  { name: 'Волк-спутник', hp: '11/11', ac: 13, owner: 'NPC', x: 'F2', type: 'npc', movement: '40 ft', initiative: 10 },
  { name: 'Сундук', hp: '—', ac: 12, owner: 'Объект', x: 'H6', type: 'object', movement: '0 ft', initiative: 0 },
];

export const initiativeOrder = [
  { name: 'Элира', score: 18, state: 'active' },
  { name: 'Борин', score: 14, state: 'ready' },
  { name: 'Гоблин-разведчик', score: 12, state: 'waiting' },
  { name: 'Волк-спутник', score: 10, state: 'waiting' },
];

export const chatMessages = [
  { author: 'Элира', kind: 'player', time: '19:31', text: 'Подхожу к алтарю и готовлю действие на случай атаки.' },
  { author: 'Мастер Аркейн', kind: 'gm', time: '19:32', text: 'Слышите треск камня сверху. Проверьте внимательность.' },
  { author: 'Борин', kind: 'player', time: '19:33', text: '/roll 1d20+2' },
  { author: 'Система', kind: 'system', time: '19:33', text: 'Борин получает 16 и замечает скрытый проход за колонной.' },
];

export const journal = [
  { time: '19:31', type: 'dice', text: 'Элира бросает 1d20+5 → 19' },
  { time: '19:32', type: 'loot', text: 'Сгенерирован лут: 34 золота и зелье лечения' },
  { time: '19:35', type: 'event', text: 'Событие: лесной патруль замечает огонь костра' },
  { time: '19:37', type: 'sheet', text: 'HP Борина обновлены до 41/41' },
  { time: '19:39', type: 'fog', text: 'Мастер открыл скрытый коридор к северной башне' },
];

export const knowledgeBase = [
  { kind: 'Заклинание', title: 'Magic Missile', meta: '1 уровень • эвокация' },
  { kind: 'Монстр', title: 'Goblin', meta: 'CR 1/4 • маленький гуманоид' },
  { kind: 'Предмет', title: 'Potion of Healing', meta: 'Расходник' },
  { kind: 'Класс', title: 'Wizard', meta: 'Полный заклинатель' },
  { kind: 'Раса', title: 'Elf', meta: 'Тонкое восприятие и тёмное зрение' },
  { kind: 'Сцена', title: 'Forest Encounter', meta: 'Event table • weighted outcome' },
];

export const characterSheets = [
  {
    name: 'Элира Найтбриз',
    subtitle: 'Эльф • Wizard • уровень 4',
    hp: '28 / 32',
    ac: 15,
    speed: 30,
    stats: 'INT 18, DEX 14, CON 12, WIS 13, CHA 10',
    spells: ['Magic Missile', 'Shield', 'Misty Step'],
    inventory: ['Arcane focus', 'Potion of Healing', 'Explorer pack'],
    owner: 'Владелец',
  },
  {
    name: 'Борин Стоунхарт',
    subtitle: 'Дварф • Fighter • уровень 4',
    hp: '41 / 41',
    ac: 18,
    speed: 25,
    stats: 'STR 18, CON 16, DEX 10, WIS 12, CHA 8',
    spells: [],
    inventory: ['Battleaxe', 'Shield', 'Rope 50 ft'],
    owner: 'Игрок',
  },
];

export const lootResults = [
  { rarity: 'Редкий', name: 'Potion of Healing', quantity: 'x1', target: 'Инвентарь Элиры' },
  { rarity: 'Обычный', name: '34 gp', quantity: 'x1', target: 'Сундук комнаты' },
  { rarity: 'Магический', name: 'Scroll of Shield', quantity: 'x1', target: 'Лут стола мастера' },
];

export const eventTables = ['Таверна', 'Дорога', 'Подземелье', 'Лес', 'Город'];

export const randomEvents = [
  {
    scene: 'Лес',
    weight: '35%',
    effect: 'Encounter',
    text: 'Вы слышите движение в кустах; появляется дружественный следопыт и предупреждает об охотниках.',
  },
  {
    scene: 'Подземелье',
    weight: '20%',
    effect: 'Trap',
    text: 'Плита под ногами проседает — следующий персонаж делает спасбросок Ловкости.',
  },
];

export const fogZones = [
  { name: 'Северная башня', state: 'Открыто', coverage: '40%' },
  { name: 'Внутренний двор', state: 'Скрыто', coverage: '100%' },
  { name: 'Подземный коридор', state: 'Частично видно', coverage: '65%' },
];

export const roomStats = [
  { label: 'Invite code', value: 'TOWER-7F2A' },
  { label: 'Участники', value: '4 / 6' },
  { label: 'Синхронизация', value: '< 300 ms' },
  { label: 'Источник контента', value: 'Custom KB index' },
];
