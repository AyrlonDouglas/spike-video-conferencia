# ADR-002 — Implementação da capability de videoconsulta (H2)

| Campo | Valor |
|-------|-------|
| **Status** | Proposto |
| **Data** | _AAAA-MM-DD_ |
| **Decisores** | _times envolvidos_ |
| **Spike** | [SPIKE-H2.md](../../SPIKE-H2.md) · [ADR-001](./ADR-001-colocacao-videoconsulta.md) |

---

## Contexto

A [spike de colocação](./ADR-001-colocacao-videoconsulta.md) decidiu **H2 — capability desacoplada** como abordagem. Esta ADR registra **como** implementar: colocação (serviço/módulo), contrato, persistência, integração com clientes e adapter de provider.

**Restrições herdadas:** ver [SPIKE-H2.md §0](../../SPIKE-H2.md).

---

## Decisão

> _Spike H2 em andamento — inclinações documentadas em [SPIKE-H2 §2.2 e §3.3.1](../../SPIKE-H2.md); confirmar em workshop._

**Colocação:** ⬜ H2-A′ Microserviço + time plataforma **(inclinação)** · ⬜ H2-B Módulo no reboot · ~~H2-C Platform shared~~ · ⬜ Híbrido B→A′ — _ver §2.3 se B/híbrido_

**Contrato consumidor:** REST (provável) — operações [SPIKE-H2 §3.3](../../SPIKE-H2.md#33-contrato-da-capability-rascunho-para-avaliar)

**Fluxo JoinSession (MVP):** cliente → **Api.Saúde** → capability _(inclinação §3.3.1)_

**Persistência de sessão:** _descrever_

**Sync estado → clientes:** _poll / SSE / WebSocket — pergunta #4_

**Provider adapter:** `IVideoProvider` — [SPIKE-PROVIDER §7](../../SPIKE-PROVIDER.md#7-interface-ivideoprovider-rascunho). **Vendor MVP:** GetStream Video ou LiveKit Cloud — PoC pass em ambos; escolha pendente — ver [ADR-003](./ADR-003-provider-videoconsulta.md)

**Auth:** consumidor **JWT + API keys** M2M; participante join token curto _(detalhar)_

**Escopo MVP:** [SPIKE-H2 §5](../../SPIKE-H2.md#5-mvp-h2--fatia-mínima-proposta-inicial)

**Ownership (H2-A′):** time **plataforma** opera capability; time **Api.Saúde reboot** integra consumidor

---

## Consequências

### Positivas

- H2-A′ preserva reuso multi-produto alinhado ao PRD sem exigir produto plataforma existente
- Join via Api.Saúde no MVP simplifica auth dos clientes Angular/RN

### Negativas / trade-offs aceitos

- Setup inicial de serviço dedicado (CI/CD, observabilidade, on-call plataforma)
- Latência adicional no join enquanto fluxo passar pela Api.Saúde
- Confirmação formal de colocação e fluxo ainda pendente

### Follow-ups

- [x] Spike provider iniciada — [SPIKE-PROVIDER.md](../../SPIKE-PROVIDER.md) · [ADR-003](./ADR-003-provider-videoconsulta.md)
- [x] PoC provider (§6 SPIKE-PROVIDER) — GetStream + LiveKit pass
- [ ] Escolha final provider → ADR-003 Aceito
- [ ] Backlog de implementação no reboot Api.Saúde

---

## Alternativas rejeitadas

| Alternativa | Motivo |
|-------------|--------|
| **H2-C — produto plataforma** | Não existe produto plataforma unificado hoje ([SPIKE-H2 §2.1](../../SPIKE-H2.md)) |
| **H2-B sem plano de extração** | Risco de acoplamento (lição Dr Clin); só aceitável com §2.3 |
| **Join direto cliente→capability no MVP** | Adiado — inclinação join via Api.Saúde primeiro (§3.3.1) |

---

## Notas

_Espaço para decisões de workshop H2._
