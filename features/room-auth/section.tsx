import type { RoomAuthFeatureProps } from "@/components/room/types";

export function RoomAuthSection({ isVisible, children }: RoomAuthFeatureProps) {
  if (!isVisible) return null;
  return <>{children}</>;
}
