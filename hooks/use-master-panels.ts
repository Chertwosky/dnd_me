import { useState } from "react";
import type { MasterPanelVM } from "@/components/room/types";

export type MasterPanelId = "admin" | "tokens" | "party" | "initiative" | "tools";
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
  const [isCreaturesDrawerOpen, setIsCreaturesDrawerOpen] = useState(true);
  const [creaturesDrawerWidth, setCreaturesDrawerWidth] = useState(520);
  const [creaturesDrawerTab, setCreaturesDrawerTab] = useState<"tokens" | "party">("tokens");
  const [journalFilter, setJournalFilter] = useState<JournalFilter>("all");
  const [journalSearch, setJournalSearch] = useState("");
  const [gmPanelOrder, setGmPanelOrder] = useState<MasterPanelId[]>([
    "admin",
    "tokens",
    "party",
    "initiative",
    "tools",
  ]);
  const [draggedMasterPanel, setDraggedMasterPanel] = useState<MasterPanelId | null>(null);
  const [dragOverMasterPanel, setDragOverMasterPanel] = useState<MasterPanelId | null>(null);
  const [gmPanelWidths, setGmPanelWidths] = useState<Record<MasterPanelId, number>>({
    admin: 440,
    tokens: 440,
    party: 999,
    initiative: 999,
    tools: 320,
  });

  const masterPanelVM: MasterPanelVM = {
    preset: masterPreset,
    isCreaturesDrawerOpen,
    creaturesDrawerWidth,
    creaturesDrawerTab,
    journalFilter,
    journalSearch,
  };

  return {
    masterPanelVM,
    masterPreset,
    setMasterPreset,
    isCreaturesDrawerOpen,
    setIsCreaturesDrawerOpen,
    creaturesDrawerWidth,
    setCreaturesDrawerWidth,
    creaturesDrawerTab,
    setCreaturesDrawerTab,
    journalFilter,
    setJournalFilter,
    journalSearch,
    setJournalSearch,
    gmPanelOrder,
    setGmPanelOrder,
    draggedMasterPanel,
    setDraggedMasterPanel,
    dragOverMasterPanel,
    setDragOverMasterPanel,
    gmPanelWidths,
    setGmPanelWidths,
  };
}
