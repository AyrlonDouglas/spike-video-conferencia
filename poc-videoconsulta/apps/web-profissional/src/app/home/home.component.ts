import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrchestratorService } from '../orchestrator.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly orchestrator = inject(OrchestratorService);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly sessionIdInput = signal('');

  async createSession(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const session = await this.orchestrator.createSession();
      await this.router.navigate(['/consulta', session.id]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erro ao criar sessão');
    } finally {
      this.loading.set(false);
    }
  }

  joinExisting(role: 'medico' | 'paciente'): void {
    const id = this.sessionIdInput().trim();
    if (!id) return;
    void this.router.navigate(['/consulta', id], { queryParams: { role } });
  }
}
