import type { ReactNode } from "react";
import type { RoomViewModel } from "@/components/room/types";
import { RoomAuthSection } from "@/features/room-auth";
import { MasterWorkspaceSection } from "@/features/master-workspace";
import { BoardSection } from "@/features/board";
import { TokensSection } from "@/features/tokens";
import { PartySection } from "@/features/party";
import { InitiativeSection } from "@/features/initiative";
import { JournalSection } from "@/features/journal";
import { LevelUpSection } from "@/features/level-up";

type GameRoomShellProps = {
  viewModel: RoomViewModel;
  auth: ReactNode;
  masterWorkspace: ReactNode;
  board: ReactNode;
  tokens: ReactNode;
  party: ReactNode;
  initiative: ReactNode;
  journal: ReactNode;
  levelUp: ReactNode;
};

export function GameRoomShell({
  viewModel,
  auth,
  masterWorkspace,
  board,
  tokens,
  party,
  initiative,
  journal,
  levelUp,
}: GameRoomShellProps) {
  if (viewModel.joinStep !== "ready") {
    return <RoomAuthSection>{auth}</RoomAuthSection>;
  }

  const role = viewModel.role ?? "spectator";

  if (role === "gm") {
    return (
      <>
        <MasterWorkspaceSection>{masterWorkspace}</MasterWorkspaceSection>
        <BoardSection>{board}</BoardSection>
        <TokensSection>{tokens}</TokensSection>
        <PartySection>{party}</PartySection>
        <InitiativeSection>{initiative}</InitiativeSection>
        <JournalSection>{journal}</JournalSection>
        <LevelUpSection>{levelUp}</LevelUpSection>
      </>
    );
  }

  if (role === "player") {
    return (
      <>
        <BoardSection>{board}</BoardSection>
        <PartySection>{party}</PartySection>
        <InitiativeSection>{initiative}</InitiativeSection>
        <JournalSection>{journal}</JournalSection>
        <LevelUpSection>{levelUp}</LevelUpSection>
      </>
    );
  }

  return (
    <>
      <BoardSection>{board}</BoardSection>
      <InitiativeSection>{initiative}</InitiativeSection>
      <JournalSection>{journal}</JournalSection>
    </>
  );
}
