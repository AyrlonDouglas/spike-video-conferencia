import { useCallback, useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { AppState, AppStateStatus, Button, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TrackReference } from '@livekit/components-react';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  VideoQuality,
  type Participant,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type TrackPublication,
} from 'livekit-client';
import { AudioSession, VideoTrack } from '@livekit/react-native';
import {
  AUDIO_PUBLISH_OPTIONS,
  connectRoomWithLocalMedia,
  createConsultaRoom,
} from '../../src/utils/livekit-room';
import type { SessionSnapshot } from '../../src/types/session';
import {
  getSession,
  joinSession,
  SESSION_NOT_FOUND,
} from '../../src/services/orchestrator';
import {
  clearActiveSession,
  setActiveSession,
} from '../../src/storage/active-session';

const POLL_404_THRESHOLD = 3;
const TERMINAL_STATES = new Set<SessionSnapshot['state']>(['encerrada', 'vetada']);

function isSessionNotFound(err: unknown): boolean {
  return err instanceof Error && err.message === SESSION_NOT_FOUND;
}

function isCameraVideoPublication(publication: {
  kind: Track.Kind;
  source: Track.Source;
}): boolean {
  return publication.kind === Track.Kind.Video && publication.source === Track.Source.Camera;
}

/** Exp 14 — qualidade alta no vídeo remoto (paciente + web); acumula Exp 10 (h540). */
function applyRemoteVideoQualityHigh(publication: TrackPublication): void {
  if (!isCameraVideoPublication(publication)) return;
  (publication as RemoteTrackPublication).setVideoQuality(VideoQuality.HIGH);
}

function cameraTrackRef(
  participant: Participant,
  publication: TrackPublication | undefined,
): TrackReference | undefined {
  if (!publication || !isCameraVideoPublication(publication) || !publication.track) {
    return undefined;
  }
  return {
    participant,
    source: Track.Source.Camera,
    publication,
  };
}

export default function ConsultaPacienteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [state, setState] = useState<SessionSnapshot['state']>('criada');
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [localVideoRef, setLocalVideoRef] = useState<TrackReference | undefined>();
  const [remoteVideoRefs, setRemoteVideoRefs] = useState<TrackReference[]>([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [connected, setConnected] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const syncMediaControls = useCallback((targetRoom: Room) => {
    const { localParticipant } = targetRoom;
    setMicEnabled(localParticipant.isMicrophoneEnabled);
    setCameraEnabled(localParticipant.isCameraEnabled);
  }, []);

  const toggleMic = useCallback(async () => {
    if (!room) return;
    try {
      const next = !micEnabled;
      await room.localParticipant.setMicrophoneEnabled(
        next,
        undefined,
        next ? AUDIO_PUBLISH_OPTIONS : undefined,
      );
      syncMediaControls(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alternar microfone');
    }
  }, [room, micEnabled, syncMediaControls]);

  const toggleCamera = useCallback(async () => {
    if (!room) return;
    try {
      const next = !cameraEnabled;
      if (next) {
        await room.localParticipant.setCameraEnabled(true, { facingMode });
      } else {
        await room.localParticipant.setCameraEnabled(false);
      }
      syncMediaControls(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alternar câmera');
    }
  }, [room, cameraEnabled, facingMode, syncMediaControls]);

  const switchCamera = useCallback(async () => {
    if (!room || !cameraEnabled) return;
    try {
      const nextFacing = facingMode === 'user' ? 'environment' : 'user';
      await room.localParticipant.setCameraEnabled(true, { facingMode: nextFacing });
      setFacingMode(nextFacing);
      syncMediaControls(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alternar câmera');
    }
  }, [room, cameraEnabled, facingMode, syncMediaControls]);

  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let appStateSub: ReturnType<typeof AppState.addEventListener> | undefined;
    let activeRoom: Room | undefined;
    let cancelled = false;
    let reconnecting = false;
    let poll404Count = 0;

    const syncLocalVideo = (targetRoom: Room) => {
      setLocalVideoRef(
        cameraTrackRef(
          targetRoom.localParticipant,
          targetRoom.localParticipant.getTrackPublication(Track.Source.Camera),
        ),
      );
    };

    const addRemoteVideoRef = (participant: RemoteParticipant, publication: TrackPublication) => {
      applyRemoteVideoQualityHigh(publication);
      const ref = cameraTrackRef(participant, publication);
      if (!ref) return;
      const sid = publication.trackSid;
      setRemoteVideoRefs((prev) =>
        prev.some((existing) => existing.publication?.trackSid === sid) ? prev : [...prev, ref],
      );
    };

    const syncRemoteVideos = (targetRoom: Room) => {
      for (const participant of targetRoom.remoteParticipants.values()) {
        for (const publication of participant.trackPublications.values()) {
          if (publication.isSubscribed && isCameraVideoPublication(publication)) {
            addRemoteVideoRef(participant, publication);
          }
        }
      }
    };

    const setupRoomListeners = (targetRoom: Room) => {
      targetRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (isCameraVideoPublication(publication)) {
          setLocalVideoRef(cameraTrackRef(targetRoom.localParticipant, publication));
        }
        syncMediaControls(targetRoom);
      });
      targetRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.source === Track.Source.Camera) {
          setLocalVideoRef(undefined);
        }
        syncMediaControls(targetRoom);
      });
      targetRoom.on(RoomEvent.TrackSubscribed, (_track, publication, participant) => {
        if (isCameraVideoPublication(publication)) {
          addRemoteVideoRef(participant, publication);
        }
      });
      targetRoom.on(RoomEvent.TrackUnsubscribed, (_track, publication) => {
        if (publication.kind === Track.Kind.Video) {
          const sid = publication.trackSid;
          setRemoteVideoRefs((prev) =>
            prev.filter((existing) => existing.publication?.trackSid !== sid),
          );
        }
      });
      targetRoom.on(RoomEvent.Disconnected, (reason) => {
        if (cancelled || reconnecting) return;
        console.error('[consulta] Desconectado do LiveKit', { sessionId, reason });
        setConnected(false);
        if (AppState.currentState === 'active') {
          void reconnectLiveKit();
        }
      });
    };

    const connectLiveKit = async (targetRoom: Room, wsUrl: string, token: string) => {
      await connectRoomWithLocalMedia(targetRoom, wsUrl, token, () => cancelled);
      if (cancelled) return;
      syncLocalVideo(targetRoom);
      syncRemoteVideos(targetRoom);
      syncMediaControls(targetRoom);
      setConnected(true);
    };

    const reconnectLiveKit = async () => {
      if (cancelled || reconnecting || !sessionId) return;
      reconnecting = true;
      setError(null);
      try {
        await activeRoom?.disconnect();
        if (cancelled) return;

        const join = await joinSession(sessionId);
        if (cancelled) return;

        setActiveSession({ sessionId, participantId: join.participantId });
        setState(join.state);
        setRemoteVideoRefs([]);

        if (!activeRoom) {
          activeRoom = createConsultaRoom();
          setupRoomListeners(activeRoom);
          setRoom(activeRoom);
        }

        await connectLiveKit(activeRoom, join.wsUrl, join.token);
      } catch (err) {
        if (cancelled) return;
        if (isSessionNotFound(err)) {
          clearActiveSession();
          router.replace({ pathname: '/', params: { error: SESSION_NOT_FOUND } });
          return;
        }
        console.error('[consulta] Erro ao reconectar', { sessionId, err });
        setError(err instanceof Error ? err.message : 'Erro ao reconectar');
      } finally {
        reconnecting = false;
      }
    };

    void (async () => {
      try {
        activeRoom = createConsultaRoom();
        setupRoomListeners(activeRoom);
        setRoom(activeRoom);

        const join = await joinSession(sessionId);
        if (cancelled) return;

        setActiveSession({ sessionId, participantId: join.participantId });
        setState(join.state);

        await connectLiveKit(activeRoom, join.wsUrl, join.token);
        if (cancelled) {
          await activeRoom.disconnect();
          return;
        }

        pollTimer = setInterval(async () => {
          try {
            const snapshot = await getSession(sessionId);
            poll404Count = 0;
            setState(snapshot.state);

            if (TERMINAL_STATES.has(snapshot.state)) {
              if (pollTimer) clearInterval(pollTimer);
              clearActiveSession();
              router.replace({
                pathname: '/',
                params: {
                  error:
                    snapshot.state === 'vetada'
                      ? 'Consulta vetada'
                      : 'Consulta encerrada',
                },
              });
            }
          } catch (err) {
            if (!isSessionNotFound(err)) return;
            poll404Count += 1;
            if (poll404Count < POLL_404_THRESHOLD) return;
            if (pollTimer) clearInterval(pollTimer);
            clearActiveSession();
            router.replace({ pathname: '/', params: { error: SESSION_NOT_FOUND } });
          }
        }, 2000);
      } catch (err) {
        if (isSessionNotFound(err)) {
          clearActiveSession();
          router.replace({ pathname: '/', params: { error: SESSION_NOT_FOUND } });
          return;
        }
        console.error('[consulta] Erro ao conectar', { sessionId, err });
        setError(err instanceof Error ? err.message : 'Erro ao conectar');
      }
    })();

    appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState !== 'active' || cancelled || reconnecting) return;
      if (activeRoom?.state === ConnectionState.Disconnected) {
        void reconnectLiveKit();
      }
    });

    return () => {
      cancelled = true;
      appStateSub?.remove();
      if (pollTimer) clearInterval(pollTimer);
      setConnected(false);
      void activeRoom?.disconnect();
    };
  }, [sessionId, syncMediaControls]);

  function handleLeave() {
    clearActiveSession();
    router.replace('/');
  }

  const stateLabel =
    state === 'ativa'
      ? 'Consulta ativa'
      : state === 'mídia_pendente'
        ? 'Estabelecendo mídia…'
        : state === 'aguardando'
          ? 'Aguardando médico…'
          : 'Conectando…';

  const primaryRemoteRef = remoteVideoRefs[0];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Videoconsulta',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Paciente — sessão {sessionId}</Text>
        <View style={[styles.status, state === 'ativa' && styles.statusActive]}>
          <Text style={styles.statusText}>{stateLabel}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {room ? (
          <View style={styles.videoStage}>
            {primaryRemoteRef ? (
              <VideoTrack style={styles.remoteVideo} trackRef={primaryRemoteRef} />
            ) : localVideoRef ? (
              <VideoTrack
                style={styles.remoteVideo}
                trackRef={localVideoRef}
                mirror={facingMode === 'user'}
              />
            ) : (
              <View style={[styles.remoteVideo, styles.videoPlaceholder]} />
            )}
            {localVideoRef && primaryRemoteRef ? (
              <View style={styles.localPip}>
                <VideoTrack
                  style={styles.pipVideo}
                  trackRef={localVideoRef}
                  mirror={facingMode === 'user'}
                  zOrder={1}
                />
              </View>
            ) : null}
          </View>
        ) : null}
        {connected ? (
          <View style={styles.controls}>
            <Pressable
              style={[styles.controlBtn, !micEnabled && styles.controlOff]}
              onPress={() => void toggleMic()}
              accessibilityRole="button"
              accessibilityLabel={micEnabled ? 'Silenciar microfone' : 'Ativar microfone'}
            >
              <Ionicons name={micEnabled ? 'mic' : 'mic-off'} size={24} color="#fff" />
              <Text style={styles.controlLabel}>{micEnabled ? 'Mic' : 'Mudo'}</Text>
            </Pressable>
            <Pressable
              style={[styles.controlBtn, !cameraEnabled && styles.controlOff]}
              onPress={() => void toggleCamera()}
              accessibilityRole="button"
              accessibilityLabel={cameraEnabled ? 'Desligar câmera' : 'Ligar câmera'}
            >
              <Ionicons name={cameraEnabled ? 'videocam' : 'videocam-off'} size={24} color="#fff" />
              <Text style={styles.controlLabel}>{cameraEnabled ? 'Câmera' : 'Off'}</Text>
            </Pressable>
            <Pressable
              style={[styles.controlBtn, !cameraEnabled && styles.controlDisabled]}
              onPress={() => void switchCamera()}
              disabled={!cameraEnabled}
              accessibilityRole="button"
              accessibilityLabel="Alternar câmera frontal/traseira"
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
              <Text style={styles.controlLabel}>Virar</Text>
            </Pressable>
          </View>
        ) : null}
        <Button title="Sair da consulta" onPress={handleLeave} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  status: { padding: 12, borderRadius: 8, backgroundColor: '#fff3cd' },
  statusActive: { backgroundColor: '#d1e7dd' },
  statusText: { fontSize: 16 },
  error: { color: '#b00020' },
  videoStage: {
    flex: 1,
    minHeight: 280,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    minHeight: 280,
    backgroundColor: '#111',
  },
  localPip: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 112,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#111',
    zIndex: 2,
    elevation: 4,
  },
  pipVideo: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: { backgroundColor: '#222' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333',
    gap: 4,
  },
  controlOff: { backgroundColor: '#842029' },
  controlDisabled: { opacity: 0.4 },
  controlLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
