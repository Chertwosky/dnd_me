# Redesign Data Contract

## Current Mode

The redesigned UI keeps the room local-first. The browser owns the live room snapshot and persists it with `localStorage` keys from `lib/room/storage.ts`.

- Room state key: `dnd-me-room:{roomId}`.
- Character library key: `dnd-me-character-library:{roomId}`.
- Export/import JSON remains the handoff format for scenes.

## API Boundary

`app/api/**` currently exposes character XP, level-up and reference routes, but the browser UI does not call `/api/*` yet. Those routes stay as backend-shaped building blocks for the next phase instead of being mixed into this UI redesign.

The next backend phase should either:

- wire progression UI to the existing level-up API routes; or
- replace the current API stubs with the realtime persistence layer described in the architecture docs.

Until that happens, room UI should not introduce partial server authority for only one slice of state. Keeping map, tokens, sheets, journal and progression under one local-first contract avoids split-brain saves during the redesign.

