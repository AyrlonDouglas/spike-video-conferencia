export type SessionState =
  | "criada"
  | "aguardando"
  | "mídia_pendente"
  | "ativa"
  | "encerrada"
  | "vetada";

export interface SessionSnapshot {
  id: string;
  state: SessionState;
  providerRoomId: string;
  livekitUrl: string;
  participants: {
    participantId: string;
    role: "medico" | "paciente";
    connected: boolean;
    audio: boolean;
    video: boolean;
  }[];
  mediaReady: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionResponse {
  id: string;
  state: SessionState;
  livekitUrl: string;
}

export interface JoinSessionResponse {
  sessionId: string;
  role: "medico" | "paciente";
  participantId: string;
  token: string;
  wsUrl: string;
  state: SessionState;
}
