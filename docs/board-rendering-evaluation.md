# Board rendering evaluation (P4)

After viewport windowing on the CSS grid (`TacticalBoard`), evaluate engines for large maps (40×40+).

## Options

| Approach | Pros | Cons | MWG |
|----------|------|------|-----|
| **CSS grid + windowing** (current) | No new deps; DOM tokens stay accessible | Scale-transform zoom is layout-heavy; many cells still costly | `defer-rendering-heavy-content`, `interactions-in-complex-layouts` |
| **Konva / canvas** (see `docs/architecture.md`) | Smooth pan/zoom; fewer DOM nodes | Separate a11y layer for tokens; more integration work | Aligns with architecture; not `expose-canvas` |
| **HTML-in-canvas** | DOM inside canvas | Baseline Newly; immature for production VTT | `expose-canvas-content-to-browser-features` — prototype only |

## Recommendation

1. Keep **windowed CSS grid** for local-first MVP.
2. If INP remains high on 50×50 maps, spike **Konva** in `features/board` with HTML token overlay for screen readers.
3. Revisit **HTML-in-canvas** only after Baseline Widely and feature-detect in a branch.

## Acceptance metrics

- Drag token on 40×40: INP &lt; 200ms (Performance panel).
- Pan map: defer fog/vision recompute to `scrollend` where applicable.
