import type { MasterWorkspaceFeatureProps } from "@/components/room/types";

export function MasterWorkspaceSection({ role, children }: MasterWorkspaceFeatureProps) {
  if (role !== "gm") return null;
  return <>{children}</>;
}
