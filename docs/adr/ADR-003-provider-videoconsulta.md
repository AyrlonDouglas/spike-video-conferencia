# ADR-003 — Provider de mídia para videoconsulta (H2)

| Campo | Valor |
|-------|-------|
| **Status** | Proposto |
| **Data** | 2026-05-21 |
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

Ver matriz e custos: [SPIKE-PROVIDER.md §2–§5](../../SPIKE-PROVIDER.md).

---

## Decisão

> **Provisória (desk research concluído; confirmação obrigatória via PoC §6).** Aceitar este ADR após PoC pass nos critérios de alta prioridade.

**Caminho MVP (inclinação):** **P0 — GetStream Video**

- SDKs alinhados à stack do time (Node, Angular, React Native)
- Webhooks para eventos de participante/track (base anti-desencontro)
- Ganho **H3** limitado mas real (familiaridade vendor; possível conta ecossistema Dr Clin) — **não** reduz escopo da capability H2
- TCO estimado competitivo no baseline (~72k participant-min/mês)

**Plan B:** **P0 — Daily.co** — se PoC GetStream falhar em C3 mobile ou anti-desencontro.

**Caminho “provider próprio” no médio prazo:** **P1 — LiveKit self-host** (Docker/Compose na AWS viável — [SPIKE-PROVIDER §2.5](../../SPIKE-PROVIDER.md#25-livekit-self-host--docker-e-escopo-operacional)) — reavaliar no go-live+6m ou se volume 10× + requisito soberania; **não** bloqueia MVP CPaaS.

**Rejeitado para MVP:**

- **Twilio Go Rooms** — legado / EOL; apenas baseline de migração
- **P2 WebRTC in-house** — TCO e prazo incompatíveis com reboot ([SPIKE-PROVIDER §2.4](../../SPIKE-PROVIDER.md#24-spike-técnica-p2-in-house--resumo))

**PoC em execução (finalistas):**

| Slot | Provider | Objetivo |
|------|----------|----------|
| A | GetStream Video | Confirmar MVP |
| B | LiveKit Cloud | Validar plan B / caminho P1 |

**Adapter:** implementar `IVideoProvider` conforme [SPIKE-PROVIDER §7](../../SPIKE-PROVIDER.md#7-interface-ivideoprovider-rascunho).

---

## Critérios considerados

Referência: [SPIKE-PROVIDER.md §3–§4](../../SPIKE-PROVIDER.md).

| Critério | Peso | GetStream P0 | Daily P0 | LiveKit P1 |
|----------|------|--------------|----------|------------|
| Anti-desencontro | 3 | Favorável | Favorável | Favorável |
| C3 mobile | 3 | A confirmar PoC | A confirmar PoC | A confirmar PoC |
| Stack §0.6 | 3 | Favorável | Favorável | Favorável |
| TCO MVP | 2 | Favorável | Neutro | Neutro (fixo maior) |
| Time-to-MVP | 2 | Favorável | Favorável | Neutro |
| Provider próprio (soberania) | 2 | Neutro | Neutro | Favorável |

---

## Consequências

### Positivas

- Vendor SaaS reduz SRE WebRTC no go-live do reboot
- Adapter `IVideoProvider` permite trocar GetStream → Daily ou LiveKit sem reescrever capability
- Separação política de custo (capability) vs mecanismo de mídia evita artifícios do legado Twilio

### Negativas / trade-offs aceitos

- Lock-in moderado em APIs/SDKs GetStream (mitigado por adapter)
- PoC obrigatório antes de implementação em produção
- LiveKit self-host adiado — possível dívida se soberania for requisito hard no go-live

### Follow-ups

- [ ] Executar PoC [SPIKE-PROVIDER §6](../../SPIKE-PROVIDER.md#6-poc--escopo-finalistas-e-critérios)
- [ ] Preencher tabela resultados §6.6
- [ ] Validar LGPD/DPA com segurança
- [ ] Proposta de custo → stakeholders
- [ ] Atualizar [ADR-002](./ADR-002-implementacao-h2.md) — campo Provider adapter
- [ ] Aceitar ADR-003 após PoC green

---

## Alternativas rejeitadas (desk research)

| Alternativa | Motivo |
|-------------|--------|
| Manter Twilio Go Rooms no reboot | EOL; artifícios de custo no legado; incompatível com H2 |
| P2 WebRTC in-house no MVP | 10+ semanas estimadas; anti-desencontro sem webhooks prontos; TCO >> CPaaS |
| mediasoup/Janus P1 | Gap SDK React Native vs LiveKit |
| Vonage / Agora / Dyte / Zoom na shortlist | Não superam shortlist atual em time-to-MVP + stack |
| **100ms** | Server SDK Node em **beta** — knockout capability **NestJS** (SPIKE §0.6) |
| **Amazon Chime SDK** | Long list only — não shortlist; RN mobile-first (SPIKE-PROVIDER §2.3) |

---

## Notas

**Gate de implementação:** desenvolvimento do adapter em produção **somente** após PoC §6 com pass em mídia bidirecional, C3 RN e E2E nas três stacks.

**Histórico PoC:** registrar em [SPIKE-PROVIDER §6.6](../../SPIKE-PROVIDER.md#66-resultados-poc).
