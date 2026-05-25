import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { ProviderMediaEvent } from '../provider/video-provider.interface';
import type { IVideoProvider } from '../provider/video-provider.interface';
import type {
  CreateSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
  ParticipantMediaState,
  SessionSnapshot,
  SessionState,
} from './session.types';
import { VIDEO_PROVIDER } from './video-provider.token';

interface SessionRecord {
  id: string;
  state: SessionState;
  providerRoomId: string;
  livekitUrl: string;
  roomProvisioned: boolean;
  participants: Map<string, ParticipantMediaState>;
  joinCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_UNJOINED_TTL_MS = 30 * 60_000;

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionsService.name);
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly livekitUrl: string;
  private readonly cleanupIntervalMs: number;
  private readonly unjoinedTtlMs: number;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(VIDEO_PROVIDER) private readonly provider: IVideoProvider,
    config: ConfigService,
  ) {
    this.livekitUrl = config.getOrThrow<string>('LIVEKIT_URL');
    this.cleanupIntervalMs = config.get<number>(
      'SESSION_CLEANUP_INTERVAL_MS',
      DEFAULT_CLEANUP_INTERVAL_MS,
    );
    this.unjoinedTtlMs = config.get<number>(
      'SESSION_UNJOINED_TTL_MS',
      DEFAULT_UNJOINED_TTL_MS,
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.restoreSessionsFromProvider();
    } catch (err) {
      this.logger.error('Falha ao restaurar sessões do LiveKit Cloud', err);
    }

    void this.cleanupOrphanSessions();
    this.cleanupTimer = setInterval(() => {
      void this.cleanupOrphanSessions();
    }, this.cleanupIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async createSession(): Promise<CreateSessionResponse> {
    const id = randomUUID();

    const session: SessionRecord = {
      id,
      state: 'criada',
      providerRoomId: id,
      livekitUrl: this.livekitUrl,
      roomProvisioned: false,
      participants: new Map(),
      joinCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(id, session);
    return { id, state: session.state, livekitUrl: this.livekitUrl };
  }

  async getSession(id: string): Promise<SessionSnapshot> {
    const session = this.requireSession(id);
    await this.reconcileMediaState(session);
    return this.toSnapshot(session);
  }

  async joinSession(
    id: string,
    body: JoinSessionRequest,
  ): Promise<JoinSessionResponse> {
    const session = this.requireSession(id);
    this.assertJoinAllowed(session);
    await this.ensureRoomProvisioned(session);

    const existing = [...session.participants.values()].find(
      (p) => p.role === body.role,
    );
    if (existing) {
      return this.rejoinSession(session, existing);
    }

    const participantId =
      body.participantId ?? `${body.role}-${randomUUID().slice(0, 8)}`;
    const { token, wsUrl } = await this.provider.createParticipantToken(
      session.providerRoomId,
      participantId,
      body.role,
      3600,
    );

    session.participants.set(participantId, {
      participantId,
      role: body.role,
      connected: false,
      audio: false,
      video: false,
    });

    session.joinCount += 1;
    this.applyJoinTransition(session);
    session.updatedAt = new Date();

    return {
      sessionId: id,
      role: body.role,
      participantId,
      token,
      wsUrl,
      state: session.state,
    };
  }

  private async rejoinSession(
    session: SessionRecord,
    participant: ParticipantMediaState,
  ): Promise<JoinSessionResponse> {
    participant.connected = false;
    participant.audio = false;
    participant.video = false;
    if (session.state === 'ativa') session.state = 'mídia_pendente';

    if (session.roomProvisioned) {
      const snapshot = await this.provider.getRoomState(session.providerRoomId);
      const stillInRoom = snapshot.participants.some(
        (p) => p.participantId === participant.participantId,
      );
      if (stillInRoom) {
        await this.provider.removeParticipant(
          session.providerRoomId,
          participant.participantId,
        );
      }
    }

    const { token, wsUrl } = await this.provider.createParticipantToken(
      session.providerRoomId,
      participant.participantId,
      participant.role,
      3600,
    );

    session.updatedAt = new Date();

    return {
      sessionId: session.id,
      role: participant.role,
      participantId: participant.participantId,
      token,
      wsUrl,
      state: session.state,
    };
  }

  async endSession(id: string): Promise<SessionSnapshot> {
    const session = this.requireSession(id);
    if (session.roomProvisioned) {
      await this.provider.destroyRoom(session.providerRoomId);
    }
    session.state = 'encerrada';
    session.updatedAt = new Date();
    return this.toSnapshot(session);
  }

  async vetoSession(id: string): Promise<SessionSnapshot> {
    const session = this.requireSession(id);
    if (session.roomProvisioned) {
      await this.provider.destroyRoom(session.providerRoomId);
    }
    session.state = 'vetada';
    session.updatedAt = new Date();
    return this.toSnapshot(session);
  }

  async handleWebhookEvents(events: ProviderMediaEvent[]): Promise<void> {
    const affectedSessions = new Set<SessionRecord>();

    for (const event of events) {
      if (event.type === 'room_destroyed') {
        const session = this.findSessionByRoomId(event.providerRoomId);
        if (session) {
          this.markSessionEndedByProvider(session);
          affectedSessions.add(session);
        }
        continue;
      }

      const session = this.findSessionByParticipant(event.participantId);
      if (!session) continue;

      const participant = session.participants.get(event.participantId);
      if (!participant) continue;

      affectedSessions.add(session);

      switch (event.type) {
        case 'participant_connected':
          participant.connected = true;
          break;
        case 'participant_disconnected':
          participant.connected = false;
          participant.audio = false;
          participant.video = false;
          if (session.state === 'ativa') session.state = 'mídia_pendente';
          break;
        case 'track_published':
          participant[event.kind] = true;
          break;
        case 'track_unpublished':
          participant[event.kind] = false;
          if (session.state === 'ativa') session.state = 'mídia_pendente';
          break;
      }

      this.evaluateMediaState(session);
      session.updatedAt = new Date();
    }

    for (const session of affectedSessions) {
      await this.reconcileMediaState(session);
    }
  }

  private async restoreSessionsFromProvider(): Promise<void> {
    const rooms = await this.provider.listActiveRooms();
    let restored = 0;

    for (const room of rooms) {
      if (this.sessions.has(room.providerRoomId)) continue;

      const now = new Date();
      const participants = new Map<string, ParticipantMediaState>();

      for (const participant of room.participants) {
        participants.set(participant.participantId, {
          participantId: participant.participantId,
          role: participant.role,
          connected: true,
          audio: participant.audio,
          video: participant.video,
        });
      }

      const session: SessionRecord = {
        id: room.providerRoomId,
        state: this.inferStateFromParticipants([...participants.values()]),
        providerRoomId: room.providerRoomId,
        livekitUrl: this.livekitUrl,
        roomProvisioned: true,
        participants,
        joinCount: participants.size,
        createdAt: room.createdAt ?? now,
        updatedAt: now,
      };

      this.evaluateMediaState(session);
      this.sessions.set(session.id, session);
      restored += 1;
    }

    if (restored > 0) {
      this.logger.log(`Restauradas ${restored} sessão(ões) do LiveKit Cloud`);
    } else {
      this.logger.debug(
        'Nenhuma room ativa no LiveKit (listRooms vazio). ' +
          'O dashboard Sessions mostra histórico/analytics, não rooms abertas.',
      );
    }
  }

  async cleanupOrphanSessions(): Promise<void> {
    const now = Date.now();

    for (const session of this.sessions.values()) {
      if (session.state === 'encerrada' || session.state === 'vetada') continue;

      if (!session.roomProvisioned && session.joinCount === 0) {
        if (now - session.createdAt.getTime() > this.unjoinedTtlMs) {
          session.state = 'encerrada';
          session.updatedAt = new Date();
        }
        continue;
      }

      if (!session.roomProvisioned) continue;

      try {
        await this.provider.getRoomState(session.providerRoomId);
      } catch {
        this.markSessionEndedByProvider(session);
      }
    }
  }

  private async reconcileMediaState(session: SessionRecord): Promise<void> {
    if (!session.roomProvisioned) return;
    if (session.state === 'encerrada' || session.state === 'vetada') return;

    try {
      const snapshot = await this.provider.getRoomState(session.providerRoomId);
      const liveById = new Map(
        snapshot.participants.map((p) => [p.participantId, p]),
      );

      for (const participant of session.participants.values()) {
        const live = liveById.get(participant.participantId);
        if (live) {
          participant.connected = true;
          participant.audio = live.audio;
          participant.video = live.video;
        } else {
          participant.connected = false;
          participant.audio = false;
          participant.video = false;
        }
      }

      const participants = [...session.participants.values()];
      const allConnected = participants.every((p) =>
        liveById.has(p.participantId),
      );
      const allMedia = participants.every((p) => p.audio && p.video);

      if (session.state === 'ativa' && (!allConnected || !allMedia)) {
        session.state = 'mídia_pendente';
      }

      this.evaluateMediaState(session);
      session.updatedAt = new Date();
    } catch {
      // Room may not exist yet or LiveKit API unavailable.
    }
  }

  private evaluateMediaState(session: SessionRecord): void {
    const participants = [...session.participants.values()];
    if (participants.length < 2) return;
    if (
      participants.every((p) => p.audio && p.video) &&
      session.state === 'mídia_pendente'
    ) {
      session.state = 'ativa';
    }
  }

  private inferStateFromParticipants(
    participants: ParticipantMediaState[],
  ): SessionState {
    if (participants.length < 2) return 'aguardando';
    if (participants.every((p) => p.audio && p.video)) return 'ativa';
    return 'mídia_pendente';
  }

  private async ensureRoomProvisioned(session: SessionRecord): Promise<void> {
    if (session.roomProvisioned) return;
    await this.provider.createRoom(session.id, { sessionId: session.id });
    session.roomProvisioned = true;
    session.updatedAt = new Date();
  }

  private applyJoinTransition(session: SessionRecord): void {
    if (session.state === 'criada') session.state = 'aguardando';
    else if (session.state === 'aguardando' && session.joinCount >= 2)
      session.state = 'mídia_pendente';
  }

  private assertJoinAllowed(session: SessionRecord): void {
    if (session.state === 'encerrada' || session.state === 'vetada') {
      throw new ForbiddenException('Sessão encerrada ou vetada');
    }
  }

  private requireSession(id: string): SessionRecord {
    const session = this.sessions.get(id);
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return session;
  }

  private findSessionByParticipant(
    participantId: string,
  ): SessionRecord | undefined {
    for (const session of this.sessions.values()) {
      if (session.participants.has(participantId)) return session;
    }
    return undefined;
  }

  private findSessionByRoomId(
    providerRoomId: string,
  ): SessionRecord | undefined {
    return this.sessions.get(providerRoomId);
  }

  private markSessionEndedByProvider(session: SessionRecord): void {
    if (session.state === 'encerrada' || session.state === 'vetada') return;

    session.state = 'encerrada';
    session.updatedAt = new Date();

    for (const participant of session.participants.values()) {
      participant.connected = false;
      participant.audio = false;
      participant.video = false;
    }
  }

  private toSnapshot(session: SessionRecord): SessionSnapshot {
    const participants = [...session.participants.values()];
    return {
      id: session.id,
      state: session.state,
      providerRoomId: session.providerRoomId,
      livekitUrl: session.livekitUrl,
      participants,
      mediaReady:
        participants.length >= 2 &&
        participants.every((p) => p.audio && p.video),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
