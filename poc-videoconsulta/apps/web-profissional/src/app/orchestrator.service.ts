import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import type {
  CreateSessionResponse,
  JoinSessionResponse,
  SessionSnapshot,
} from './session.types';

@Injectable({ providedIn: 'root' })
export class OrchestratorService {
  private readonly baseUrl = environment.orchestratorUrl;

  async createSession(): Promise<CreateSessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions`, { method: 'POST' });
    if (!response.ok) throw new Error('Falha ao criar sessão');
    return response.json();
  }

  async joinSession(sessionId: string, role: 'medico' | 'paciente'): Promise<JoinSessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) throw new Error('Falha ao entrar na sessão');
    return response.json();
  }

  async getSession(sessionId: string): Promise<SessionSnapshot> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`);
    if (!response.ok) throw new Error('Sessão não encontrada');
    return response.json();
  }

  async endSession(sessionId: string): Promise<SessionSnapshot> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/end`, { method: 'POST' });
    if (!response.ok) throw new Error('Falha ao encerrar sessão');
    return response.json();
  }
}
