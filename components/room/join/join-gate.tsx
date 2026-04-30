import type { ChangeEvent } from "react";

import { Badge, Button, Field, Panel } from "@/components/ui";

type JoinIntent = "gm" | "player" | null;
type RoomRole = "gm" | "player" | "spectator";
type JoinStep = "auth" | "player-sheet" | "ready";

export function JoinGate({
  role,
  joinStep,
  joinIntent,
  displayName,
  passwordInput,
  authError,
  onJoinIntentChange,
  onDisplayNameChange,
  onPasswordInputChange,
  onJoinAsSpectator,
  onRoomAuth,
  onCreatePlayerCharacter,
  onImportCharacterJson,
}: {
  role: RoomRole | null;
  joinStep: JoinStep;
  joinIntent: JoinIntent;
  displayName: string;
  passwordInput: string;
  authError: string;
  onJoinIntentChange: (intent: JoinIntent) => void;
  onDisplayNameChange: (value: string) => void;
  onPasswordInputChange: (value: string) => void;
  onJoinAsSpectator: () => void;
  onRoomAuth: (intent?: Exclude<JoinIntent, null>) => void;
  onCreatePlayerCharacter: () => void;
  onImportCharacterJson: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel eyebrow="Вход" title="Выберите роль и соберите стол без лишних настроек" description="Первый мастер задает пароль комнаты. Игроки входят по нему, а наблюдатель может подключиться только для просмотра.">
        <div className="flex flex-wrap gap-2 text-sm">
          <Button type="button" tone={joinIntent === "gm" ? "primary" : "ghost"} onClick={() => onJoinIntentChange("gm")}>
            Мастер
          </Button>
          <Button type="button" tone={joinIntent === "player" ? "primary" : "ghost"} onClick={() => onJoinIntentChange("player")}>
            Игрок
          </Button>
          <Button type="button" tone="secondary" onClick={onJoinAsSpectator}>
            Наблюдатель
          </Button>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-6 text-slate-400">
          {joinIntent === "gm"
            ? "Роль мастера доступна для первого входа в комнату."
            : "Игроку нужен пароль комнаты и лист персонажа. Наблюдатель входит без листа."}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Field label="Имя за столом" value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} placeholder="Ваше имя" />
          <Field label="Пароль комнаты" value={passwordInput} onChange={(event) => onPasswordInputChange(event.target.value)} type="password" placeholder="Пароль" />
        </div>
        {authError ? <div className="mt-3 text-sm text-rose-300">{authError}</div> : null}
        <Button type="button" tone="primary" className="mt-5" onClick={() => onRoomAuth(joinIntent ?? undefined)}>
          {joinIntent === "gm" ? "Создать комнату" : "Войти в комнату"}
        </Button>
      </Panel>

      <Panel eyebrow={role === "player" && joinStep === "player-sheet" ? "Лист игрока" : "Роли"} title={role === "player" && joinStep === "player-sheet" ? "Добавьте персонажа перед входом" : "Каждая роль видит свой уровень деталей"}>
        {role === "player" && joinStep === "player-sheet" ? (
          <div className="space-y-4 text-sm text-slate-300">
            <button type="button" onClick={onCreatePlayerCharacter} className="w-full rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-left transition hover:border-emerald-300/60">
              <div className="font-medium text-parchment-100">Заполнить лист в комнате</div>
              <div className="mt-1 text-slate-300">Создается пустой шаблон персонажа для ручного заполнения.</div>
            </button>
            <label className="block cursor-pointer rounded-2xl border border-rune-400/30 bg-rune-500/10 px-4 py-4 text-left transition hover:border-rune-300/60">
              <div className="font-medium text-parchment-100">Залить JSON с longstoryshort.app</div>
              <div className="mt-1 text-slate-300">JSON-экспорт превращается в токен и лист персонажа.</div>
              <input type="file" accept="application/json" className="hidden" onChange={onImportCharacterJson} />
            </label>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-slate-300">
            {[
              ["Мастер", "Две карты, туман, существа, панели, лут, события и журнал."],
              ["Игрок", "Свой токен, лист персонажа, броски и прогрессия без мастерского шума."],
              ["Наблюдатель", "Просмотр сцены, инициативы и журнала без изменения состояния."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-parchment-100">{title}</div>
                  <Badge tone={title === "Мастер" ? "ember" : title === "Игрок" ? "rune" : "arcane"}>{title}</Badge>
                </div>
                <div className="mt-1 leading-6">{text}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </section>
  );
}

