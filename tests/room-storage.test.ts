import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSavedRoomState,
  getCharacterLibraryStorageKey,
  getRoomStorageKey,
} from "../lib/room/storage.ts";

test("builds stable storage keys for room snapshots and character libraries", () => {
  assert.equal(getRoomStorageKey("demo-room"), "dnd-me-room:demo-room");
  assert.equal(
    getCharacterLibraryStorageKey("demo-room"),
    "dnd-me-character-library:demo-room",
  );
});

test("returns room snapshot payload without changing its shape", () => {
  const payload = {
    mapName: "Руины",
    tokens: [{ id: "elira" }],
    gmLayout: { version: 2 },
  };

  assert.deepEqual(buildSavedRoomState(payload), payload);
});

