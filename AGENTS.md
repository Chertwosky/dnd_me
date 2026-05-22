# Arcane Table — agent guidance

## Modern Web Guidance (MWG)

Before implementing or changing **HTML, CSS, or client-side JavaScript** in this repo:

1. Search: `npx -y modern-web-guidance@latest search "<action-oriented query>" --skill-version 2026_05_16-c5e7870`
2. Retrieve: `npx -y modern-web-guidance@latest retrieve "<guide-id>"`

On Windows, if `npx` fails, use `npx.cmd`. Local copies live in [`.agents/skills/modern-web-guidance`](.agents/skills/modern-web-guidance).

## Browser support policy

- **Default:** [Baseline Widely available](https://web.dev/baseline/) features without polyfills.
- **Popover / `<dialog>` / Invoker Commands:** use native APIs; provide minimal React fallbacks only where state must sync with existing hooks.
- **View Transitions, scroll-driven animations:** feature-detect; run state updates without animation when unsupported.
- **Experimental (HTML-in-canvas, etc.):** do not use for core VTT until documented in [`docs/board-rendering-evaluation.md`](docs/board-rendering-evaluation.md).

## Out of scope for MWG skill

Database, Prisma, Socket.IO server routes, CI/CD — follow [`docs/architecture.md`](docs/architecture.md) instead.
