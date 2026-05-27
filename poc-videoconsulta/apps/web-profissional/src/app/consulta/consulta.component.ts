import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RemoteTrackPublication, Room, RoomEvent, Track } from 'livekit-client';
import type { SessionSnapshot } from '../session.types';
import {
  connectRoomWithLocalMedia,
  createConsultaRoom,
  disconnectReasonLabel,
  disconnectRoom,
} from '../livekit-room';
import { OrchestratorService } from '../orchestrator.service';

@Component({
  selector: 'app-consulta',
  imports: [RouterLink],
  templateUrl: './consulta.component.html',
  styleUrl: './consulta.component.css',
})
export class ConsultaComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orchestrator = inject(OrchestratorService);

  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteAudio') remoteAudioRef?: ElementRef<HTMLAudioElement>;

  protected readonly sessionId = signal('');
  protected readonly role = signal<'medico' | 'paciente'>('medico');
  protected readonly state = signal<SessionSnapshot['state']>('criada');
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly connected = signal(false);
  protected readonly micEnabled = signal(true);
  protected readonly cameraEnabled = signal(true);

  private room?: Room;
  private pollTimer?: ReturnType<typeof setInterval>;
  private connectGeneration = 0;
  private bootstrapStarted = false;

  constructor() {
    const id = this.route.snapshot.paramMap.get('sessionId') ?? '';
    const roleParam = this.route.snapshot.queryParamMap.get('role');
    const role = roleParam === 'paciente' ? 'paciente' : 'medico';
    this.sessionId.set(id);
    this.role.set(role);
  }

  ngAfterViewInit(): void {
    if (this.bootstrapStarted) return;
    this.bootstrapStarted = true;
    void this.bootstrap(this.sessionId(), this.role());
  }

  ngOnDestroy(): void {
    this.connectGeneration += 1;
    if (this.pollTimer) clearInterval(this.pollTimer);
    void disconnectRoom(this.room);
  }

  protected stateLabel(): string {
    switch (this.state()) {
      case 'ativa':
        return 'Consulta ativa';
      case 'mídia_pendente':
        return 'Estabelecendo mídia…';
      case 'aguardando':
        return this.role() === 'paciente' ? 'Aguardando médico…' : 'Aguardando participante…';
      case 'encerrada':
        return 'Encerrada';
      case 'vetada':
        return 'Vetada';
      default:
        return 'Sessão criada';
    }
  }

  protected isActive(): boolean {
    return this.state() === 'ativa';
  }

  async endConsultation(): Promise<void> {
    await this.orchestrator.endSession(this.sessionId());
    await this.leaveToHome();
  }

  async toggleMic(): Promise<void> {
    if (!this.room) return;
    try {
      const next = !this.micEnabled();
      await this.room.localParticipant.setMicrophoneEnabled(next);
      this.syncMediaControls();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erro ao alternar microfone');
    }
  }

  async toggleCamera(): Promise<void> {
    if (!this.room) return;
    try {
      const next = !this.cameraEnabled();
      await this.room.localParticipant.setCameraEnabled(next);
      this.syncMediaControls();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erro ao alternar câmera');
    }
  }

  private async leaveToHome(): Promise<void> {
    this.connectGeneration += 1;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    await disconnectRoom(this.room);
    this.room = undefined;
    this.connected.set(false);
    await this.router.navigateByUrl('/');
  }

  private async bootstrap(sessionId: string, role: 'medico' | 'paciente'): Promise<void> {
    const generation = ++this.connectGeneration;
    const isStale = () => generation !== this.connectGeneration;

    this.loading.set(true);
    this.error.set(null);
    try {
      await disconnectRoom(this.room);
      if (isStale()) return;

      const join = await this.orchestrator.joinSession(sessionId, role);
      if (isStale()) return;
      this.state.set(join.state);

      const room = createConsultaRoom();
      this.room = room;
      room.on(RoomEvent.TrackSubscribed, (_track, publication) => {
        this.attachRemoteTrack(publication);
      });
      room.on(RoomEvent.TrackUnsubscribed, (_track, publication) => {
        this.detachRemoteTrack(publication);
      });
      room.on(RoomEvent.MediaDevicesError, (err) => {
        this.error.set(err instanceof Error ? err.message : 'Erro ao acessar câmera/microfone');
      });
      room.on(RoomEvent.Disconnected, (reason) => {
        if (!isStale()) {
          this.connected.set(false);
          this.error.set(disconnectReasonLabel(reason));
        }
      });
      room.on(RoomEvent.LocalTrackPublished, () => {
        if (!isStale()) this.syncMediaControls();
      });
      room.on(RoomEvent.LocalTrackUnpublished, () => {
        if (!isStale()) this.syncMediaControls();
      });
      room.on(RoomEvent.TrackMuted, (_publication, participant) => {
        if (!isStale() && participant.isLocal) this.syncMediaControls();
      });
      room.on(RoomEvent.TrackUnmuted, (_publication, participant) => {
        if (!isStale() && participant.isLocal) this.syncMediaControls();
      });

      await connectRoomWithLocalMedia(room, join.wsUrl, join.token, isStale);
      if (isStale()) return;

      this.connected.set(true);
      this.syncMediaControls();

      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.trackPublications.values()) {
          if (publication.isSubscribed) {
            this.attachRemoteTrack(publication);
          }
        }
      }

      this.pollTimer = setInterval(() => void this.poll(sessionId), 2000);
    } catch (err) {
      if (!isStale()) {
        this.error.set(err instanceof Error ? err.message : 'Erro ao conectar');
      }
    } finally {
      if (!isStale()) this.loading.set(false);
    }
  }

  private syncMediaControls(): void {
    if (!this.room) return;
    const { localParticipant } = this.room;
    this.micEnabled.set(localParticipant.isMicrophoneEnabled);
    this.cameraEnabled.set(localParticipant.isCameraEnabled);
    this.syncLocalVideo();
  }

  private syncLocalVideo(): void {
    const element = this.localVideoRef?.nativeElement;
    if (!element || !this.room) return;

    const track = this.room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (track) {
      track.attach(element);
      return;
    }

    element.srcObject = null;
  }

  private attachRemoteTrack(publication: RemoteTrackPublication): void {
    if (publication.kind === Track.Kind.Video && this.remoteVideoRef) {
      publication.videoTrack?.attach(this.remoteVideoRef.nativeElement);
      return;
    }
    if (publication.kind === Track.Kind.Audio && this.remoteAudioRef) {
      publication.audioTrack?.attach(this.remoteAudioRef.nativeElement);
    }
  }

  private detachRemoteTrack(publication: RemoteTrackPublication): void {
    if (publication.kind === Track.Kind.Video) {
      const element = this.remoteVideoRef?.nativeElement;
      if (element) publication.videoTrack?.detach(element);
      return;
    }
    if (publication.kind === Track.Kind.Audio) {
      const element = this.remoteAudioRef?.nativeElement;
      if (element) publication.audioTrack?.detach(element);
    }
  }

  private async poll(sessionId: string): Promise<void> {
    try {
      const snapshot = await this.orchestrator.getSession(sessionId);
      this.state.set(snapshot.state);
      if (snapshot.state === 'encerrada' || snapshot.state === 'vetada') {
        await this.leaveToHome();
      }
    } catch {
      // ignore transient polling errors
    }
  }
}
