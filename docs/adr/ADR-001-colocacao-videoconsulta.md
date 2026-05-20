# ADR-001 — Colocação da capability de videoconsulta

| Campo | Valor |
|-------|-------|
| **Status** | Proposto |
| **Data** | _AAAA-MM-DD_ |
| **Decisores** | _times envolvidos_ |
| **Spike** | [SPIKE.md](../../SPIKE.md) · [PRD.md](../../PRD.md) |

---

## Contexto

A Api.Saúde precisa suportar consultas online entre profissional de saúde e paciente, com estabilidade, escalabilidade e possibilidade de reuso no ecossistema Clin&Co. A implementação atual usa Go Rooms (Twilio); o PRD levanta hipóteses de acoplamento (H1), capability compartilhada (H2) e reaproveitamento de práticas do ecossistema (H3).

Cenários críticos: conexão e consulta (~60 min), no-show, reconexão, encerramento com veto de reentrada do paciente.

**Contexto levantado na spike (ver [SPIKE.md §0](../../SPIKE.md)):**

- ~20 consultas/dia, ~60 min, sempre 2 participantes (1:1), N em paralelo
- Paciente mobile-first; profissional e backoffice desktop + responsivo
- Budget: proposta paramétrica → validação stakeholders
- Realtime do ecossistema (GetStream): **apenas chat**, não cobre vídeo — H3 limitado a práticas transversais

---

## Decisão

> _Preencher ao final da spike._

**Abordagem escolhida:** ⬜ H1 — Acoplada à Api.Saúde · ⬜ H2 — Capability desacoplada · ⬜ Híbrida — _descrever_

**Fonte da verdade do estado da sessão:** _Api.Saúde / serviço dedicado / provider / combinação_

**Política de reconexão (C3):** _mesma sessão técnica / nova sessão com continuidade de negócio_

---

## Critérios considerados

Referência completa: [SPIKE.md — seções 3 e 4](../../SPIKE.md).

| Critério | Peso | H1 | H2 | Comentário |
|----------|------|----|----|------------|
| Time-to-MVP | | | | |
| Reuso multi-produto | | | | |
| Consistência de sessão | | | | |
| Custo em escala | | | | |
| Operação / suporte | | | | |
| Flexibilidade / lock-in | | | | |
| Migração Twilio | | | | |

---

## Consequências

### Positivas

- _Listar após decisão_

### Negativas / trade-offs aceitos

- _Listar após decisão_

### Follow-ups

- [ ] PoCs listados em [SPIKE.md §9](../../SPIKE.md#9-escopo-do-poc-futuro-fora-desta-fase)
- [ ] Unknowns da [SPIKE.md §5](../../SPIKE.md) resolvidos ou com dono
- [ ] Contrato negócio × vídeo publicado (interno)

---

## Alternativas rejeitadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| H1 — _se rejeitada_ | |
| H2 — _se rejeitada_ | |
| _Outras_ | |

---

## Notas

_Espaço livre para discussões da spike, links de incidentes (“desencontros”), dados de volume, etc._
