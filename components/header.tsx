import Link from 'next/link';
import { LinkButton } from '@/components/ui';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 font-semibold text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ember-300/30 bg-ember-400/10 text-sm text-ember-200 shadow-ember-glow">
            D20
          </span>
          <div>
            <div className="text-parchment-100">Arcane Table</div>
            <div className="text-xs font-normal text-slate-400">мастерская живой сессии</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="#flow" className="transition hover:text-parchment-100">Как идет игра</Link>
          <Link href="#roles" className="transition hover:text-parchment-100">Роли</Link>
          <Link href="#implemented" className="transition hover:text-parchment-100">Возможности</Link>
          <Link href="/rooms/demo-room">
            <LinkButton tone="primary" className="px-4 py-2">
              Открыть демо-стол
            </LinkButton>
          </Link>
        </nav>
      </div>
    </header>
  );
}
