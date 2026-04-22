import type { MasterWorkspaceFeatureProps } from "@/components/room/types";

export function MasterWorkspaceSection({ role, children }: MasterWorkspaceFeatureProps) {
  if (role !== "gm") return null;

  return (
    <section
      data-master-workspace="enabled"
      data-master-columns="primary-secondary-utility"
      className="space-y-4"
    >
      {children}
    </section>
  );
}
