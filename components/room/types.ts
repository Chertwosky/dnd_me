import type { ReactNode } from "react";

export type RoomRole = "gm" | "player" | "spectator";
export type JoinStep = "auth" | "player-sheet" | "ready";

export interface RoomViewModel {
  roomId: string;
  role: RoomRole | null;
  joinStep: JoinStep;
}

export interface MasterPanelVM {
  preset: "combat" | "explore" | "prep";
  isCreaturesDrawerOpen: boolean;
  creaturesDrawerWidth: number;
  creaturesDrawerTab: "tokens" | "party";
  journalFilter:
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
  journalSearch: string;
}

export interface RoomAuthFeatureProps {
  isVisible: boolean;
  children: ReactNode;
}

export interface MasterWorkspaceFeatureProps {
  role: RoomRole | null;
  children: ReactNode;
}

export interface RoomFeatureProps {
  children: ReactNode;
}
