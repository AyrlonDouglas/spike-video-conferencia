import type {
  CreateSessionResponse,
  JoinSessionResponse,
  SessionSnapshot,
} from "../types/session";

const BASE_URL =
  process.env.EXPO_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:3000";

export const SESSION_NOT_FOUND = "Sessão não encontrada";

async function assertOk(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  if (response.status === 404) throw new Error(SESSION_NOT_FOUND);
  throw new Error(fallback);
}

export async function createSession(): Promise<CreateSessionResponse> {
  console.log({ BASE_URL });
  const response = await fetch(`${BASE_URL}/sessions`, { method: "POST" });
  if (!response.ok) throw new Error("Falha ao criar sessão");
  return response.json();
}

export async function joinSession(
  sessionId: string,
): Promise<JoinSessionResponse> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "paciente" }),
  });
  await assertOk(response, "Falha ao entrar na sessão");
  return response.json();
}

export async function getSession(sessionId: string): Promise<SessionSnapshot> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}`);
  await assertOk(response, SESSION_NOT_FOUND);
  return response.json();
}
