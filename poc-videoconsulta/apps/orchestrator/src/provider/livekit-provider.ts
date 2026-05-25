import {
  AccessToken,
  RoomServiceClient,
  WebhookReceiver,
  type WebhookEvent,
} from 'livekit-server-sdk';
import type {
  IVideoProvider,
  ParticipantRole,
  ProviderActiveRoom,
  ProviderMediaEvent,
  ProviderRoomSnapshot,
} from './video-provider.interface';

export interface LiveKitProviderConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export class LiveKitProvider implements IVideoProvider {
  private readonly roomService: RoomServiceClient;
  private readonly webhookReceiver: WebhookReceiver;
  private readonly wsUrl: string;

  constructor(private readonly config: LiveKitProviderConfig) {
    const httpUrl = config.url
      .replace(/^wss:\/\//, 'https://')
      .replace(/^ws:\/\//, 'http://');
    this.wsUrl = config.url.startsWith('ws')
      ? config.url
      : `wss://${config.url}`;
    this.roomService = new RoomServiceClient(
      httpUrl,
      config.apiKey,
      config.apiSecret,
    );
    this.webhookReceiver = new WebhookReceiver(config.apiKey, config.apiSecret);
  }

  async createRoom(
    sessionId: string,
    metadata?: Record<string, string>,
  ): Promise<{ providerRoomId: string }> {
    await this.roomService.createRoom({
      name: sessionId,
      emptyTimeout: 300,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
    return { providerRoomId: sessionId };
  }

  async destroyRoom(providerRoomId: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(providerRoomId);
    } catch {
      // Room may already be gone.
    }
  }

  async removeParticipant(
    providerRoomId: string,
    participantId: string,
  ): Promise<void> {
    try {
      await this.roomService.removeParticipant(providerRoomId, participantId);
    } catch {
      // Participant may already be disconnected.
    }
  }

  async createParticipantToken(
    providerRoomId: string,
    participantId: string,
    role: ParticipantRole,
    ttlSeconds: number,
  ): Promise<{ token: string; wsUrl: string }> {
    const token = new AccessToken(this.config.apiKey, this.config.apiSecret, {
      identity: participantId,
      name: role,
      ttl: ttlSeconds,
      metadata: JSON.stringify({ role }),
    });

    token.addGrant({
      roomJoin: true,
      room: providerRoomId,
      canPublish: true,
      canSubscribe: true,
    });

    return {
      token: await token.toJwt(),
      wsUrl: this.wsUrl,
    };
  }

  async getRoomState(providerRoomId: string): Promise<ProviderRoomSnapshot> {
    const participants =
      await this.roomService.listParticipants(providerRoomId);

    return {
      providerRoomId,
      participantCount: participants.length,
      participants: participants.map((participant) => ({
        participantId: participant.identity,
        audio: participant.tracks.some(
          (track) => trackKindFromTrack(track) === 'audio',
        ),
        video: participant.tracks.some(
          (track) => trackKindFromTrack(track) === 'video',
        ),
      })),
    };
  }

  async listActiveRooms(): Promise<ProviderActiveRoom[]> {
    const rooms = await this.roomService.listRooms();
    const results: ProviderActiveRoom[] = [];

    for (const room of rooms) {
      if (!room.name) continue;

      const rawParticipants = await this.roomService.listParticipants(
        room.name,
      );
      const participants = rawParticipants.flatMap((participant) => {
        const role = roleFromParticipant(
          participant.name,
          participant.metadata,
          participant.identity,
        );
        if (!role) return [];

        return [
          {
            participantId: participant.identity,
            role,
            audio: participant.tracks.some(
              (track) => trackKindFromTrack(track) === 'audio',
            ),
            video: participant.tracks.some(
              (track) => trackKindFromTrack(track) === 'video',
            ),
          },
        ];
      });

      results.push({
        providerRoomId: room.name,
        createdAt: roomCreatedAt(room),
        participants,
      });
    }

    return results;
  }

  async verifyWebhook(
    payload: unknown,
    authorizationHeader: string,
  ): Promise<boolean> {
    try {
      await this.receiveWebhook(
        typeof payload === 'string' ? payload : JSON.stringify(payload),
        authorizationHeader,
      );
      return true;
    } catch {
      return false;
    }
  }

  async receiveWebhook(
    body: string,
    authorizationHeader: string,
  ): Promise<WebhookEvent> {
    return this.webhookReceiver.receive(body, authorizationHeader);
  }

  parseMediaEvents(payload: unknown): ProviderMediaEvent[] {
    const event = payload as WebhookEvent;

    if (event.event === 'room_finished') {
      const providerRoomId = event.room?.name;
      return providerRoomId ? [{ type: 'room_destroyed', providerRoomId }] : [];
    }

    const participantId = event.participant?.identity;
    if (!participantId) {
      return [];
    }

    switch (event.event) {
      case 'participant_joined':
        return [{ type: 'participant_connected', participantId }];
      case 'participant_left':
      case 'participant_connection_aborted':
        return [{ type: 'participant_disconnected', participantId }];
      case 'track_published': {
        const kind = trackKindFromTrack(event.track);
        return kind ? [{ type: 'track_published', participantId, kind }] : [];
      }
      case 'track_unpublished': {
        const kind = trackKindFromTrack(event.track);
        return kind ? [{ type: 'track_unpublished', participantId, kind }] : [];
      }
      default:
        return [];
    }
  }
}

function roomCreatedAt(room: {
  creationTimeMs?: bigint;
  creationTime?: bigint;
}): Date | undefined {
  if (room.creationTimeMs) return new Date(Number(room.creationTimeMs));
  if (room.creationTime) return new Date(Number(room.creationTime) * 1000);
  return undefined;
}

function roleFromParticipant(
  name: string,
  metadata: string,
  identity: string,
): ParticipantRole | null {
  if (name === 'medico' || name === 'paciente') return name;

  try {
    const parsed = JSON.parse(metadata || '{}') as { role?: string };
    if (parsed.role === 'medico' || parsed.role === 'paciente')
      return parsed.role;
  } catch {
    // ignore invalid metadata
  }

  if (identity.startsWith('medico-')) return 'medico';
  if (identity.startsWith('paciente-')) return 'paciente';
  return null;
}

function trackKindFromTrack(track?: {
  source?: number | string;
  type?: number | string;
}): 'audio' | 'video' | null {
  if (!track) return null;

  const source = track.source;
  if (source === 1 || source === 'CAMERA') return 'video';
  if (source === 2 || source === 'MICROPHONE') return 'audio';

  const type = track.type;
  if (type === 1 || type === 'VIDEO') return 'video';
  if (type === 0 || type === 'AUDIO') return 'audio';

  return null;
}
