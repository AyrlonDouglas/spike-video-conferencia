# ADR-003 — Provider de mídia para videoconsulta (H2)

| Campo | Valor |
|-------|-------|
| **Status** | Proposto — PoC concluído; escolha final pendente |
| **Data** | 2026-05-21 (atualizado 2026-05-26) |
| **Decisores** | _times envolvidos_ |
| **Spike** | [SPIKE-PROVIDER.md](../../SPIKE-PROVIDER.md) · [SPIKE.md](../../SPIKE.md) · [ADR-001](./ADR-001-colocacao-videoconsulta.md) · [ADR-002](./ADR-002-implementacao-h2.md) |

---

## Contexto

A capability H2 ([ADR-001](./ADR-001-colocacao-videoconsulta.md)) orquestra estado de sessão; a **camada de mídia** (provider) fornece rooms, tokens WebRTC e fatos técnicos via webhooks. A implementação legada usa **Twilio Go Rooms**, em contexto de **EOL** do Programmable Video (dez/2024) — migração no **cutover do reboot** da Api.Saúde.

**Restrições:** 1:1 fixo; anti-desencontro (`mídia_pendente` → `ativa`); C3 híbrido; stacks **NestJS + Angular + React Native**; ~20 consultas/dia.

**Hipóteses avaliadas na spike:**

| ID | Descrição |
|----|-----------|
| **P0** | CPaaS gerenciado (GetStream, Daily, LiveKit Cloud, …) |
| **P1** | SFU open-source self-host (LiveKit self-host) |
| **P2** | WebRTC in-house (signaling + coturn + P2P) — **adiado** pós desk research |

Ver matriz, PoC e custos: [SPIKE-PROVIDER.md §2–§6](../../SPIKE-PROVIDER.md).

**PoC (mai/2026):** finalistas **GetStream Video (A)** e **LiveKit Cloud (B)** pass em P1–P6 — [RESULTADOS-POC.md](../../poc-videoconsulta/docs/RESULTADOS-POC.md).

---

## Decisão

> **Provisória — PoC concluído; aceitar este ADR após escolha explícita entre GetStream e LiveKit Cloud.**

**Candidatos MVP (empate técnico pós-PoC):**

| Slot | Provider | PoC | Destaque |
|------|----------|-----|----------|
| **A** | **GetStream Video (P0)** | ✅ Pass | H3 ecossistema Dr Clin; SDKs maduros |
| **B** | **LiveKit Cloud (P0)** | ✅ Pass | **Menor OPEX baseline** (~US$ 52/mês Ship vs ~US$ 108/mês GetStream HD, bruto); caminho P1 self-host |

**Inclinação desk research (pré-PoC):** GetStream Video — **revisar** à luz do comparativo de custo §5 SPIKE-PROVIDER.

**Plan C:** **Daily.co** — não executado; A e B pass.

**Caminho “provider próprio” no médio prazo:** **P1 — LiveKit self-host** — reavaliar no go-live+6m ou volume 10×; **facilitado** se MVP for LiveKit Cloud (mesmos SDKs).

**Rejeitado para MVP:**

- **Twilio Go Rooms** — legado / EOL
- **P2 WebRTC in-house** — TCO e prazo incompatíveis ([SPIKE-PROVIDER §2.4](../../SPIKE-PROVIDER.md#24-spike-técnica-p2-in-house--resumo))

**Adapter:** implementar `IVideoProvider` conforme [SPIKE-PROVIDER §7](../../SPIKE-PROVIDER.md#7-interface-ivideoprovider-rascunho).

---

## Critérios considerados

Referência: [SPIKE-PROVIDER.md §3–§4, §6.7](../../SPIKE-PROVIDER.md).

| Critério | Peso | GetStream P0 | LiveKit Cloud P0 | Daily P0 |
|----------|------|--------------|------------------|----------|
| Anti-desencontro | 3 | ✅ PoC | ✅ PoC | — |
| C3 mobile | 3 | ✅ PoC | ✅ PoC | — |
| Stack §0.6 | 3 | Favorável | Favorável | Favorável |
| TCO MVP (bruto) | 2 | ~US$ 108/mês HD | **~US$ 52/mês Ship** | ~US$ 248/mês |
| Time-to-MVP | 2 | Favorável | Favorável | Favorável |
| H3 ecossistema | 1 | **Favorável** | Neutro | Fraco |
| Provider próprio (P1) | 2 | Neutro | **Favorável** | Neutro |

---

## Consequências

### Positivas

- PoC elimina risco técnico de anti-desencontro e C3 nos dois finalistas
- Adapter `IVideoProvider` permite trocar provider sem reescrever capability
- Comparativo de custo documentado para decisão informada (§5 SPIKE-PROVIDER)

### Negativas / trade-offs aceitos

- Escolha final ainda pendente — bloqueia implementação produção até ADR Aceito
- GetStream HD baseline ~2× LiveKit Ship (estimativa bruta)
- LiveKit: menor ganho H3 vs GetStream

### Follow-ups

- [x] Executar PoC [SPIKE-PROVIDER §6](../../SPIKE-PROVIDER.md#6-poc--escopo-finalistas-e-critérios)
- [x] Preencher tabela resultados §6.6
- [ ] **Escolher** GetStream ou LiveKit Cloud para MVP
- [ ] Validar LGPD/DPA com segurança
- [ ] Proposta de custo §5 → stakeholders
- [ ] Atualizar [ADR-002](./ADR-002-implementacao-h2.md) — campo Provider adapter
- [ ] Aceitar ADR-003 após provider nomeado

---

## Alternativas rejeitadas (desk research + PoC)

| Alternativa | Motivo |
|-------------|--------|
| Manter Twilio Go Rooms no reboot | EOL; artifícios de custo no legado |
| P2 WebRTC in-house no MVP | TCO >> CPaaS |
| Daily.co no PoC | A e B pass — plan C desnecessário |
| mediasoup/Janus P1 | Gap SDK React Native vs LiveKit |
| **100ms** | Server SDK Node em beta |
| **Amazon Chime SDK** | Long list only — RN mobile-first |

---

## Notas

**Gate de implementação:** adapter em produção **somente** após ADR-003 **Aceito** com provider escolhido (GetStream ou LiveKit).

**Histórico PoC:** [SPIKE-PROVIDER §6.6](../../SPIKE-PROVIDER.md#66-resultados-poc) · [RESULTADOS-POC.md](../../poc-videoconsulta/docs/RESULTADOS-POC.md).
