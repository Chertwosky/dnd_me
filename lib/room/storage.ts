export const ROOM_STORAGE_PREFIX = "dnd-me-room:";
export const CHARACTER_LIBRARY_STORAGE_PREFIX = "dnd-me-character-library:";

export function getRoomStorageKey(roomId: string) {
  return `${ROOM_STORAGE_PREFIX}${roomId}`;
}

export function getCharacterLibraryStorageKey(roomId: string) {
  return `${CHARACTER_LIBRARY_STORAGE_PREFIX}${roomId}`;
}

export function buildSavedRoomState<TSavedRoomState extends object>(
  state: TSavedRoomState,
): TSavedRoomState {
  return state;
}

