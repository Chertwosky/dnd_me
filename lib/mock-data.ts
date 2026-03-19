export const productHighlights = [
  'Комнаты по invite-ссылке с ролями мастер / игрок / наблюдатель',
  'Игровое поле с картой, сеткой, токенами и панорамированием',
  'Карточки персонажей, броски кубов, лут и случайные события',
  'Справка в боковой панели без выхода из комнаты',
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

export const roomMembers = [
  { name: 'Элира', role: 'Игрок', status: 'online' },
  { name: 'Борин', role: 'Игрок', status: 'online' },
  { name: 'Мастер Аркейн', role: 'Мастер', status: 'host' },
  { name: 'Наблюдатель', role: 'Наблюдатель', status: 'idle' },
];

export const tokens = [
  { name: 'Элира', hp: '28/32', ac: 15, owner: 'Игрок', x: 'B4' },
  { name: 'Борин', hp: '41/41', ac: 18, owner: 'Игрок', x: 'C5' },
  { name: 'Гоблин-разведчик', hp: '7/7', ac: 13, owner: 'NPC', x: 'G4' },
  { name: 'Сундук', hp: '—', ac: 12, owner: 'Объект', x: 'H6' },
];

export const journal = [
  { time: '19:31', type: 'dice', text: 'Элира бросает 1d20+5 → 19' },
  { time: '19:32', type: 'loot', text: 'Сгенерирован лут: 34 золота и зелье лечения' },
  { time: '19:35', type: 'event', text: 'Событие: лесной патруль замечает огонь костра' },
  { time: '19:37', type: 'sheet', text: 'HP Борина обновлены до 41/41' },
];

export const knowledgeBase = [
  { kind: 'Заклинание', title: 'Magic Missile', meta: '1 уровень • эвокация' },
  { kind: 'Монстр', title: 'Goblin', meta: 'CR 1/4 • маленький гуманоид' },
  { kind: 'Предмет', title: 'Potion of Healing', meta: 'Расходник' },
  { kind: 'Класс', title: 'Wizard', meta: 'Полный заклинатель' },
  { kind: 'Раса', title: 'Elf', meta: 'Тонкое восприятие и тёмное зрение' },
];

export const eventTables = [
  'Таверна',
  'Дорога',
  'Подземелье',
  'Лес',
  'Город',
];
