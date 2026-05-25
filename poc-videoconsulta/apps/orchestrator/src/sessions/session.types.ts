import type { ParticipantRole } from '../provider/video-provider.interface';

export type SessionState =
  | 'criada'
  | 'aguardando'
  | 'mídia_pendente'
  | 'ativa'
  | 'encerrada'
  | 'vetada';

export interface ParticipantMediaState {
  participantId: string;
  role: ParticipantRole;
  connected: boolean;
  audio: boolean;
  video: boolean;
}

export interface SessionSnapshot {
  id: string;
  state: SessionState;
  providerRoomId: string;
  livekitUrl: string;
  participants: ParticipantMediaState[];
  mediaReady: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionResponse {
  id: string;
  state: SessionState;
  livekitUrl: string;
}

export interface JoinSessionRequest {
  role: ParticipantRole;
  participantId?: string;
}

export interface JoinSessionResponse {
  sessionId: string;
  role: ParticipantRole;
  participantId: string;
  token: string;
  wsUrl: string;
  state: SessionState;
}
