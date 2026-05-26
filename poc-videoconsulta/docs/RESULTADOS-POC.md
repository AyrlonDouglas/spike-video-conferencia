# Resultados PoC — finalistas A (GetStream) e B (LiveKit)

> Referência: [SPIKE-PROVIDER §6.6](../../SPIKE-PROVIDER.md#66-resultados-poc) · [PLANO-POC-PROVIDER.md](../../docs/poc/PLANO-POC-PROVIDER.md)

Repositório: `poc-videoconsulta/` (orquestrador NestJS, web Angular, mobile Expo/RN).

## Resumo

| Finalista | Provider | Resultado |
|-----------|----------|-----------|
| **A** | GetStream Video | **Pass** — P1–P6 |
| **B** | LiveKit Cloud | **Pass** — P1–P6 |
| Plan C | Daily.co | **Não executado** — A e B pass |

Ambos supriram os **requisitos obrigatórios** do projeto (anti-desencontro, C3, C4, stacks §0.6).

---

## GetStream Video (finalista A)

| Prova | Pass? | Notas |
|-------|-------|-------|
| P1 — Áudio+vídeo bidirecional | Sim | |
| P2 — Webhook antes de `ativa` | Sim | |
| P3 — UI não mostra ativa sem P2 | Sim | |
| P4 — Rejoin C3 (Expo) | Sim | |
| P5 — Rejoin bloqueado após encerrar | Sim | |
| P6 — Sem sessão órfã | Sim | |

## LiveKit Cloud (finalista B)

| Prova | Pass? | Notas |
|-------|-------|-------|
| P1 — Áudio+vídeo bidirecional | Sim | |
| P2 — Webhook antes de `ativa` | Sim | |
| P3 — UI não mostra ativa sem P2 | Sim | |
| P4 — Rejoin C3 (Expo) | Sim | |
| P5 — Rejoin bloqueado após encerrar | Sim | |
| P6 — Sem sessão órfã | Sim | |

---

## Evidências

- Logs orquestrador:
- Screenshots / vídeo:
- Data dos testes:

---

## Recomendação

- **Go técnico** — ambos finalistas viáveis para MVP
- **Decisão pendente** — escolha entre GetStream e LiveKit com base em custo (§5 SPIKE-PROVIDER), H3 e lock-in
- Daily.co — plan C; não necessário após pass duplo
