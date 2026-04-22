import { useState } from "react";
import type { JoinStep, RoomRole, RoomViewModel } from "@/components/room/types";

export type JoinIntent = "gm" | "player" | null;

export function useRoomState(roomId: string) {
  const [roomPassword, setRoomPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [displayName, setDisplayName] = useState("Мастер Аркейн");
  const [joinIntent, setJoinIntent] = useState<JoinIntent>("player");
  const [role, setRole] = useState<RoomRole | null>(null);
  const [joinStep, setJoinStep] = useState<JoinStep>("auth");
  const [authError, setAuthError] = useState("");

  const roomViewModel: RoomViewModel = {
    roomId,
    role,
    joinStep,
  };

  return {
    roomViewModel,
    roomPassword,
    setRoomPassword,
    passwordInput,
    setPasswordInput,
    displayName,
    setDisplayName,
    joinIntent,
    setJoinIntent,
    role,
    setRole,
    joinStep,
    setJoinStep,
    authError,
    setAuthError,
  };
}
