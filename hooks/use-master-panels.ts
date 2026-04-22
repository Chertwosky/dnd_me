import { useMemo, useState } from "react";
import type { MasterPanelVM } from "@/components/room/types";
import {
  createDefaultLayoutConfig,
  type LayoutConfig,
  type MasterPanelId,
  moveMasterPanel,
} from "@/lib/master-panel-layout";

export type MasterViewPreset = "combat" | "explore" | "prep";
export type JournalFilter =
  | "system"
  | "move"
  | "dice"
  | "loot"
  | "event"
  | "sheet"
  | "map"
  | "room"
  | "save"
  | "initiative"
  | "all";

export function useMasterPanels() {
  const [masterPreset, setMasterPreset] = useState<MasterViewPreset>("combat");
  const [isSecondaryPanelOpen, setIsSecondaryPanelOpen] = useState(false);
  const [secondaryPanelId, setSecondaryPanelId] = useState<MasterPanelId>("tokens");
  const [journalFilter, setJournalFilter] = useState<JournalFilter>("all");
  const [journalSearch, setJournalSearch] = useState("");
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    createDefaultLayoutConfig,
  );
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);

  const masterPanelVM: MasterPanelVM = useMemo(
    () => ({
      preset: masterPreset,
      isSecondaryPanelOpen,
      secondaryPanelId,
      journalFilter,
      journalSearch,
    }),
    [
      isSecondaryPanelOpen,
      journalFilter,
      journalSearch,
      masterPreset,
      secondaryPanelId,
    ],
  );

  const moveLayoutPanel = (panelId: MasterPanelId, direction: "up" | "down") => {
    setLayoutConfig((current) => ({
      ...current,
      order: moveMasterPanel(current.order, panelId, direction),
    }));
  };

  return {
    masterPanelVM,
    masterPreset,
    setMasterPreset,
    isSecondaryPanelOpen,
    setIsSecondaryPanelOpen,
    secondaryPanelId,
    setSecondaryPanelId,
    journalFilter,
    setJournalFilter,
    journalSearch,
    setJournalSearch,
    layoutConfig,
    setLayoutConfig,
    moveLayoutPanel,
    isLayoutEditorOpen,
    setIsLayoutEditorOpen,
  };
}
