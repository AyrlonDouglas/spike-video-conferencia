import {
  ConnectionState,
  DisconnectReason,
  Room,
  RoomEvent,
  VideoPresets,
  type RoomConnectOptions,
} from 'livekit-client';

/** Exp 2 (bandwidth): publicação h360 — ver docs/poc/BANDWIDTH-EXPERIMENTOS.md */
export function createConsultaRoom(): Room {
  return new Room({
    disconnectOnPageLeave: false,
    videoCaptureDefaults: {
      resolution: VideoPresets.h360.resolution,
    },
    publishDefaults: {
      videoEncoding: VideoPresets.h360.encoding,
    },
  });
}

const CONNECT_OPTIONS: RoomConnectOptions = {
  autoSubscribe: true,
};

export async function disconnectRoom(room?: Room): Promise<void> {
  if (!room || room.state === ConnectionState.Disconnected) return;
  await room.disconnect(true);
}

export async function connectRoomWithLocalMedia(
  room: Room,
  wsUrl: string,
  token: string,
  isStale: () => boolean,
): Promise<void> {
  await ensureMediaPermissions();
  if (isStale()) return;

  await room.connect(wsUrl, token, CONNECT_OPTIONS);
  if (isStale()) {
    await disconnectRoom(room);
    return;
  }

  await waitForConnected(room, isStale);
  if (isStale()) {
    await disconnectRoom(room);
    return;
  }

  try {
    await room.localParticipant.setMicrophoneEnabled(true);
    if (isStale()) return;
    await room.localParticipant.setCameraEnabled(true);
  } catch (err) {
    await disconnectRoom(room);
    throw err;
  }
}

export function disconnectReasonLabel(reason?: DisconnectReason): string {
  switch (reason) {
    case DisconnectReason.DUPLICATE_IDENTITY:
      return 'Outra aba ou reconexão usou a mesma identidade';
    case DisconnectReason.PARTICIPANT_REMOVED:
      return 'Participante removido do servidor';
    case DisconnectReason.ROOM_DELETED:
      return 'Sala encerrada';
    case DisconnectReason.CLIENT_INITIATED:
      return 'Conexão encerrada pelo cliente';
    case DisconnectReason.USER_UNAVAILABLE:
      return 'Câmera ou microfone indisponível';
    case DisconnectReason.MEDIA_FAILURE:
      return 'Falha na conexão de áudio/vídeo (WebRTC)';
    case DisconnectReason.JOIN_FAILURE:
      return 'Falha ao entrar na sala';
    case DisconnectReason.CONNECTION_TIMEOUT:
      return 'Tempo esgotado ao conectar';
    default:
      return reason !== undefined ? `Desconectado (código ${reason})` : 'Desconectado da sala';
  }
}

async function ensureMediaPermissions(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  for (const track of stream.getTracks()) track.stop();
}

function waitForConnected(room: Room, isStale: () => boolean): Promise<void> {
  if (room.state === ConnectionState.Connected) return Promise.resolve();
  if (isStale()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onConnected = () => {
      cleanup();
      resolve();
    };
    const onDisconnected = (reason?: DisconnectReason) => {
      cleanup();
      reject(new Error(disconnectReasonLabel(reason)));
    };
    const cleanup = () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
  });
}
