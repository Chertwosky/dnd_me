# Technical Architecture

## 1. Recommended stack

### Frontend

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Zustand
- TanStack Query
- Konva.js

### Backend

- Next.js Route Handlers / Server Actions for MVP
- Socket.IO server
- PostgreSQL
- Prisma ORM
- Redis

### Storage & auth

- S3-compatible object storage
- Magic link authentication
- Optional OAuth providers

## 2. High-level architecture

```text
Browser clients
  ├─ Next.js UI
  ├─ Konva map canvas
  ├─ Zustand local room state
  └─ Socket.IO client
          │
          ▼
Next.js app server
  ├─ Route Handlers / server actions
  ├─ Socket.IO gateway
  ├─ auth/session layer
  ├─ room permission checks
  └─ content orchestration
          │
  ┌───────┼───────────┬───────────────┐
  ▼       ▼           ▼               ▼
Postgres  Redis       S3              Search/content index
Prisma    presence    maps/files      KB entities
```

## 3. Responsibilities by layer

### Next.js frontend

- room lobby and game UI;
- map rendering and token interactions;
- side panel for sheets, loot, events and reference articles;
- optimistic UI for token movement;
- dice/chat log rendering.

### API/server layer

- authentication and session validation;
- invite-link resolution;
- CRUD for rooms, maps, tokens, sheets and generators;
- upload orchestration for files;
- permissions and role enforcement.

### Realtime layer

- presence tracking;
- room subscriptions;
- token movement broadcasts;
- dice/log/event fan-out;
- lightweight conflict resolution.

## 4. Suggested domain model

### User

- `id`
- `email`
- `name`
- `avatarUrl`
- `createdAt`

### SessionRoom

- `id`
- `name`
- `ownerId`
- `inviteCode`
- `status`
- `createdAt`

### RoomMember

- `id`
- `roomId`
- `userId`
- `role` (`gm`, `player`, `spectator`)
- `characterSheetId?`

### Map

- `id`
- `roomId`
- `imageUrl`
- `width`
- `height`
- `gridSize`
- `fogData`

### Token

- `id`
- `roomId`
- `mapId`
- `name`
- `type` (`player`, `npc`, `monster`, `object`)
- `x`
- `y`
- `size`
- `ownerMemberId?`
- `characterSheetId?`

### CharacterSheet

- `id`
- `roomId`
- `ownerUserId?`
- `name`
- `class`
- `race`
- `hp`
- `ac`
- `speed`
- `statsJson`
- `inventoryJson`
- `spellsJson`
- `attachmentUrl?`

### LootTable / LootItem

- `LootTable`: название, тип, JSON-entries, roomId
- `LootItem`: результат генерации, редкость, количество, получатель

### EventTable / EventEntry

- `EventTable`: сцена, название, roomId
- `EventEntry`: текст, вес, тип эффекта, payload

### DiceRoll

- `id`
- `roomId`
- `authorId`
- `formula`
- `result`
- `breakdownJson`
- `createdAt`

### JournalEntry

- `id`
- `roomId`
- `authorId`
- `type`
- `payloadJson`
- `createdAt`

## 5. Realtime event contract

### Inbound

- `join_room`
- `move_token`
- `roll_dice`
- `trigger_loot`
- `trigger_event`
- `update_sheet`
- `update_fog`

### Outbound

- `user_joined`
- `token_moved`
- `map_updated`
- `dice_rolled`
- `loot_generated`
- `event_triggered`
- `sheet_updated`
- `fog_updated`

## 6. Recommended implementation order

### Phase 1 — foundation

- bootstrap Next.js project;
- configure Prisma/PostgreSQL;
- implement auth;
- add room creation and invite join flow.

### Phase 2 — game board

- add map upload;
- render map on canvas;
- implement tokens and movement;
- connect Socket.IO synchronization.

### Phase 3 — character interaction

- add character sheet editor/viewer;
- connect tokens to sheets;
- implement dice roller and room log.

### Phase 4 — GM toolkit

- add loot tables and generator;
- add random event tables;
- add journal entries;
- add fog of war.

### Phase 5 — searchable reference

- add entity index for spells, monsters, items, classes and races;
- render results in the side panel;
- keep the content source decoupled from the room engine.

## 7. Technical risks and mitigations

### Token movement conflicts

Mitigation:

- optimistic client updates;
- authoritative server validation;
- latest-write-wins for MVP;
- optional token lock during drag.

### Oversized MVP

Mitigation:

- define “playable session” as the only release gate;
- postpone advanced campaign management;
- postpone deep automation and rule engines.

### Content licensing

Mitigation:

- avoid bundling protected content by default;
- support user-imported and custom content;
- isolate the knowledge base content source from the gameplay engine.
