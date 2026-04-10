"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Header } from "@/components/header";

const liveFeatures = [
  "Комната по ссылке + пароль: первый вход — мастер, остальные — игроки.",
  "Карта с grid, token movement, zoom, fog of war и скрытой GM-картой.",
  "Инициатива, журнал действий, генератор лута и случайных событий.",
  "Карточки персонажей, JSON import/export и трекинг ресурсов (spell slots, hit dice, rage, ki, sorcery points, death saves, exhaustion).",
  "Статусы на токенах (poisoned, stunned, prone и др.) с визуальными бейджами на карте.",
];

const nextSteps = [
  "One-click броски из карточки персонажа (атаки/спасы/скиллы).",
  "Undo/история действий карты, токенов и инициативы.",
  "Секретные триггеры и события на клетках GM-карты.",
];

function sanitizeRoomSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function LandingPage() {
  const [roomInput, setRoomInput] = useState("");
  const [copied, setCopied] = useState(false);

  const roomSlug = useMemo(() => {
    if (!roomInput.trim()) {
      return "demo-room";
    }

    return sanitizeRoomSlug(roomInput) || "demo-room";
  }, [roomInput]);

  const roomHref = `/rooms/${roomSlug}`;

  const handleCopyInvite = async () => {
    if (typeof window === "undefined") return;

    const inviteLink = `${window.location.origin}${roomHref}`;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-12 lg:py-16">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <span className="badge">Практичный старт сессии</span>
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Главная теперь про действие: создать комнату, кинуть ссылку пати и сразу играть.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              Убрали перегруз планами и оставили полезный фокус: быстрый вход в комнату,
              прозрачный статус того, что уже реально работает в продукте, и короткий список
              ближайших улучшений.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href={roomHref}
                className="rounded-full bg-fuchsia-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-fuchsia-400"
              >
                Открыть комнату: {roomSlug}
              </Link>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-slate-100 transition hover:border-cyan-400/60 hover:text-white"
              >
                {copied ? "Ссылка скопирована" : "Скопировать invite-ссылку"}
              </button>
            </div>
          </div>

          <div className="card space-y-4 p-6" id="quickstart">
            <h2 className="text-xl font-semibold text-white">Быстрый старт комнаты</h2>
            <p className="text-sm leading-6 text-slate-300">
              Это новый блок на главной: сразу задаёшь id комнаты, открываешь её и делишься ссылкой с игроками.
            </p>
            <label className="space-y-2 text-sm text-slate-200">
              <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Room id</span>
              <input
                value={roomInput}
                onChange={(event) => setRoomInput(event.target.value)}
                placeholder="например: curse-of-strahd"
                className="w-full rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/60"
              />
            </label>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs leading-6 text-slate-300">
              <div>Ссылка комнаты:</div>
              <div className="mt-1 break-all font-medium text-cyan-300">{roomHref}</div>
              <div className="mt-2 text-slate-400">
                Первый вошедший в комнату становится мастером и задаёт пароль; дальше игроки входят по тому же id.
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="space-y-5">
          <div className="space-y-2">
            <span className="badge">Что уже работает</span>
            <h2 className="section-title">Реальные функции в текущем билде</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {liveFeatures.map((feature) => (
              <article key={feature} className="card flex gap-3 p-5 text-sm leading-6 text-slate-200">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <p>{feature}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="roadmap" className="space-y-5 pb-8">
          <div className="space-y-2">
            <span className="badge">Что ещё не реализовано</span>
            <h2 className="section-title">Следующие шаги из старого roadmap</h2>
          </div>
          <div className="card p-6">
            <ul className="space-y-3 text-sm leading-6 text-slate-200">
              {nextSteps.map((step) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-fuchsia-400" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
