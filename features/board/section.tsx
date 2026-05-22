export { TacticalBoard } from "@/components/room/board/tactical-board";
export type { BoardToken } from "@/components/room/board/tactical-board";

import type { RoomFeatureProps } from "@/components/room/types";

export function FeatureSection({ children }: RoomFeatureProps) {
  return <>{children}</>;
}
