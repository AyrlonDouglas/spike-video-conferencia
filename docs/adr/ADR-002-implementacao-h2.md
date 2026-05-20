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

> _Preencher ao final da spike H2._

**Colocação:** ⬜ H2-A Microserviço · ⬜ H2-B Módulo no reboot · ⬜ H2-C Platform shared · ⬜ Híbrido — _descrever_

**Contrato consumidor:** _REST / gRPC / events — link spec_

**Persistência de sessão:** _descrever_

**Sync estado → clientes:** _poll / SSE / WebSocket_

**Provider adapter:** _interface + vendor MVP_

**Auth:** _consumidor M2M; participante join token_

**Escopo MVP:** _link SPIKE-H2 §5_

---

## Consequências

### Positivas

- _Listar após decisão_

### Negativas / trade-offs aceitos

- _Listar após decisão_

### Follow-ups

- [ ] Spike provider (escolha de vendor)
- [ ] PoC §9 [SPIKE.md](../../SPIKE.md)
- [ ] Backlog de implementação no reboot Api.Saúde

---

## Alternativas rejeitadas

| Alternativa | Motivo |
|-------------|--------|
| | |

---

## Notas

_Espaço para decisões de workshop H2._
