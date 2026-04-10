import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 font-semibold text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-500/20 text-fuchsia-300">
            D20
          </span>
          <div>
            <div>D&D Game Table</div>
            <div className="text-xs font-normal text-slate-400">MVP virtual tabletop</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="#implemented">Что работает</Link>
          <Link href="/rooms/demo-room" className="rounded-full bg-fuchsia-500 px-4 py-2 font-medium text-white">
            Открыть демо
          </Link>
        </nav>
      </div>
    </header>
  );
}
