import { GameRoomPage } from '@/components/game-room-page';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  return <GameRoomPage roomId={roomId} />;
}
