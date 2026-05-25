import { ConnectionState, Room, RoomEvent } from 'livekit-client';

export async function connectRoomWithLocalMedia(
  room: Room,
  wsUrl: string,
  token: string,
  isStale: () => boolean,
): Promise<void> {
  await room.connect(wsUrl, token);
  if (isStale()) {
    await room.disconnect();
    return;
  }

  await waitForConnected(room, isStale);
  if (isStale()) {
    await room.disconnect();
    return;
  }

  await room.localParticipant.setMicrophoneEnabled(true);
  if (isStale()) return;
  await room.localParticipant.setCameraEnabled(true);
}

function waitForConnected(room: Room, isStale: () => boolean): Promise<void> {
  if (room.state === ConnectionState.Connected) return Promise.resolve();
  if (isStale()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onConnected = () => {
      cleanup();
      resolve();
    };
    const onDisconnected = () => {
      cleanup();
      reject(new Error('Conexão encerrada antes de publicar mídia'));
    };
    const cleanup = () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
  });
}
