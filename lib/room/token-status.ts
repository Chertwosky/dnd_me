export type TokenStatusKey =
  | "poisoned"
  | "stunned"
  | "prone"
  | "concentrating"
  | "restrained"
  | "blessed"
  | "invisible"
  | "exhausted";

export const tokenStatusCatalog: Array<{
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

export function getStatusMeta(status: TokenStatusKey) {
  return tokenStatusCatalog.find((item) => item.key === status);
}
