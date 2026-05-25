export interface ActiveSession {
  sessionId: string;
  participantId: string;
}

let activeSession: ActiveSession | null = null;

export function getActiveSession(): ActiveSession | null {
  return activeSession;
}

export function setActiveSession(session: ActiveSession): void {
  activeSession = session;
}

export function clearActiveSession(): void {
  activeSession = null;
}
