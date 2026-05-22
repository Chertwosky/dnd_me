import type { ReactNode } from "react";

import type { RoomFeatureProps } from "@/components/room/types";

/** Journal UI lives in game-room-page until full panel extraction. */
export function FeatureSection({ children }: RoomFeatureProps) {
  return <>{children}</>;
}

export function JournalFeatureSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
