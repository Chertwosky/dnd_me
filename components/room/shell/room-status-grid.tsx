import { Badge } from "@/components/ui";

type RoomRole = "gm" | "player" | "spectator";

export function RoomStatusGrid({
  role,
  mapName,
  roomPassword,
  selectedTokenName,
  zoomPercent,
  playerVisionLabel,
}: {
  role: RoomRole | null;
  mapName: string;
  roomPassword: string;
  selectedTokenName: string;
  zoomPercent: number;
  playerVisionLabel: string;
}) {
  const stats = [
    ["Карта", mapName],
    [
      "Роль",
      role === "gm" ? "Мастер" : role === "player" ? "Игрок" : role === "spectator" ? "Наблюдатель" : "Не выбрана",
    ],
    ...(role === "gm" ? ([["Пароль", roomPassword ? "••••••••" : "Не задан"]] as string[][]) : []),
    ["Активный токен", selectedTokenName],
    ["Масштаб", `${zoomPercent}%`],
    ["Обзор", playerVisionLabel],
  ];

  return (
    <section className={`grid gap-3 ${role === "gm" ? "md:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-2 xl:grid-cols-5"}`}>
      {stats.map(([label, value]) => (
        <div key={label} className="arcane-panel px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
            {label === "Роль" ? <Badge tone={role === "gm" ? "ember" : role === "player" ? "rune" : "arcane"}>{value}</Badge> : null}
          </div>
          <div className="mt-2 truncate text-base font-semibold text-parchment-100">{value}</div>
        </div>
      ))}
    </section>
  );
}

