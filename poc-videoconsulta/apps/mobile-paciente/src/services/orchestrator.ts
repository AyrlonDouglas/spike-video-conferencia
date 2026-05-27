import type {
  CreateSessionResponse,
  JoinSessionResponse,
  SessionSnapshot,
} from "../types/session";

const BASE_URL =
  process.env.EXPO_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:3000";

export const SESSION_NOT_FOUND = "Sessão não encontrada";

async function fetchOrchestrator(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  try {
    return await fetch(url, init);
  } catch (err) {
    console.error("[orchestrator] Erro de conexão", { url, err });
    throw err;
  }
}

async function assertOk(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  console.error("[orchestrator] Resposta HTTP com erro", {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    body,
  });
  if (response.status === 404) throw new Error(SESSION_NOT_FOUND);
  throw new Error(fallback);
}

export async function createSession(): Promise<CreateSessionResponse> {
  const response = await fetchOrchestrator("/sessions", { method: "POST" });
  await assertOk(response, "Falha ao criar sessão");
  return response.json();
}

export async function joinSession(
  sessionId: string,
): Promise<JoinSessionResponse> {
  const response = await fetchOrchestrator(`/sessions/${sessionId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "paciente" }),
  });
  await assertOk(response, "Falha ao entrar na sessão");
  return response.json();
}

export async function getSession(sessionId: string): Promise<SessionSnapshot> {
  const response = await fetchOrchestrator(`/sessions/${sessionId}`);
  await assertOk(response, SESSION_NOT_FOUND);
  return response.json();
}
