export type ParticipantRole = 'medico' | 'paciente';

export type ProviderMediaEvent =
  | { type: 'participant_connected'; participantId: string }
  | { type: 'participant_disconnected'; participantId: string }
  | { type: 'track_published'; participantId: string; kind: 'audio' | 'video' }
  | {
      type: 'track_unpublished';
      participantId: string;
      kind: 'audio' | 'video';
    }
  | { type: 'room_destroyed'; providerRoomId: string };

export interface ProviderRoomSnapshot {
  providerRoomId: string;
  participantCount: number;
  participants: Array<{
    participantId: string;
    audio: boolean;
    video: boolean;
  }>;
}

export interface ProviderActiveRoom {
  providerRoomId: string;
  createdAt?: Date;
  participants: Array<{
    participantId: string;
    role: ParticipantRole;
    audio: boolean;
    video: boolean;
  }>;
}

export interface IVideoProvider {
  createRoom(
    sessionId: string,
    metadata?: Record<string, string>,
  ): Promise<{ providerRoomId: string }>;
  destroyRoom(providerRoomId: string): Promise<void>;
  removeParticipant(
    providerRoomId: string,
    participantId: string,
  ): Promise<void>;
  createParticipantToken(
    providerRoomId: string,
    participantId: string,
    role: ParticipantRole,
    ttlSeconds: number,
  ): Promise<{ token: string; wsUrl: string }>;
  getRoomState(providerRoomId: string): Promise<ProviderRoomSnapshot>;
  listActiveRooms(): Promise<ProviderActiveRoom[]>;
  verifyWebhook(
    payload: unknown,
    authorizationHeader: string,
  ): Promise<boolean>;
  parseMediaEvents(payload: unknown): ProviderMediaEvent[];
  receiveWebhook(body: string, authorizationHeader: string): Promise<unknown>;
}
