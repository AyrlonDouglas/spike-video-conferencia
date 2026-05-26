# Videoconsulta Api.Saúde — Resumo executivo da spike

| Campo | Valor |
|-------|-------|
| **Produto** | Api.Saúde (reboot) — consultas online 1:1 |
| **Escopo** | Arquitetura (H2) + provider de mídia + PoC técnico |
| **Período** | Mai/2026 |
| **Status** | Spike concluída · **decisão de provider pendente** |
| **Documentos fonte** | [SPIKE.md](../SPIKE.md) · [SPIKE-PROVIDER.md](../SPIKE-PROVIDER.md) · [SPIKE-H2.md](../SPIKE-H2.md) |

---

## 1. Resumo executivo

A spike de videoconsulta definiu a **abordagem arquitetural** para substituir o legado Twilio Go Rooms (EOL) no reboot da Api.Saúde. A conclusão principal é adotar uma **capability de vídeo desacoplada (H2)**, operada como serviço compartilhável, com a Api.Saúde como consumidor de negócio.

As **Provas de Conceito (PoC)** com **GetStream Video** e **LiveKit Cloud** foram concluídas com sucesso: ambos os providers atenderam os requisitos obrigatórios — áudio/vídeo bidirecional, anti-desencontro via webhooks, reconexão mobile (C3), veto pós-encerramento (C4) e integração nas stacks NestJS, Angular e React Native.

Do ponto de vista **técnico**, não há bloqueador para o MVP. A **escolha final do provider** ficou em aberto entre GetStream e LiveKit, com trade-offs claros:

| Dimensão | GetStream Video | LiveKit Cloud |
|----------|-----------------|---------------|
| Viabilidade técnica (PoC) | ✅ Pass | ✅ Pass |
| Custo OPEX baseline (bruto) | ~US$ 108/mês (HD) | **~US$ 52/mês (Ship)** |
| Ecossistema Clin&Co (H3) | **Favorável** (chat Dr Clin) | Neutro |
| Lock-in / evolução | Médio | **Forte** (open source + self-host) |

**Recomendação para stakeholders:** validar budget com o comparativo de custos (§6), definir critérios de desempate (custo vs H3 vs soberania) e **aceitar o [ADR-003](./adr/ADR-003-provider-videoconsulta.md)** nomeando o provider MVP. A implementação em produção só deve iniciar após essa decisão.

**Fora de escopo do MVP:** gravação de vídeo, grace period detalhado de C3, valores concretos de lobby/no-show (C2) — definidos pelo consumidor em rodada posterior.

---

## 2. Contexto e problema

### 2.1 Situação atual

- Videoconsulta legada acoplada à Api.Saúde via **Twilio Go Rooms** — **EOL** (Programmable Video encerrado em dez/2024).
- Incidentes recorrentes de **desencontro**: participantes “na chamada”, mas sem áudio/vídeo bidirecional.
- Artifícios técnicos introduzidos para contornar **custo e lifecycle** do Twilio aumentaram complexidade e fragilidade.
- **Reboot da Api.Saúde** em andamento — videoconsulta deve nascer como capability core, não no legado.

### 2.2 Volume e perfil de uso (baseline)

| Parâmetro | Valor |
|-----------|-------|
| Consultas por dia | ~20 |
| Duração média | ~60 min |
| Participantes | 2 (médico + paciente), 1:1 fixo |
| Consultas/mês | ~600 |
| Participant-minutes/mês | ~72.000 (100% realizadas) |
| Plataformas | Paciente: mobile (RN) · Profissional: web (Angular) |
| Backend | NestJS |

### 2.3 Restrições de mercado

- **Twilio Go Rooms** eliminado como opção greenfield.
- **GetStream chat** (Dr Clin) **≠ GetStream Video** — SDKs e módulos distintos; Api.Saúde não utiliza chat.
- Stacks do time: **Node/NestJS + Angular + React Native** — knockout de providers sem SDK server Node maduro.

---

## 3. Decisões arquiteturais

### 3.1 Hipóteses avaliadas

| ID | Hipótese | Decisão |
|----|----------|---------|
| **H1** | Vídeo acoplado à Api.Saúde (legado) | ❌ **Rejeitada** — desencontros, manutenção arriscada, incompatível com reboot |
| **H2** | Capability desacoplada / shared | ✅ **Adotada** — core do reboot; reuso multi-produto |
| **H3** | Reaproveitar ecossistema GetStream | ➖ **Ganho limitado** — familiaridade vendor; não reduz escopo H2 |

### 3.2 Modelo de responsabilidades

| Papel | Responsabilidade |
|-------|------------------|
| **Api.Saúde** | Negócio da consulta (agendamento, autorização, encerrar, vetar) |
| **Capability H2** | **Fonte da verdade** do estado da sessão; tokens; orquestração |
| **Provider de mídia** | Rooms WebRTC; webhooks com fatos técnicos (tracks, participantes) |
| **Clientes** | Refletem estado — **nunca** são fonte da verdade |

### 3.3 Estados da sessão

```
criada → aguardando → mídia_pendente → ativa → encerrada → vetada
```

**Anti-desencontro:** transição para `ativa` **somente** após confirmação de **mídia bidirecional** (webhooks do provider), não basta presença na sala ou estado de UI.

**Ordem de entrada:** paciente pode entrar primeiro (`aguardando`); consulta avança quando o segundo participante entra (`mídia_pendente`) e a mídia é confirmada (`ativa`).

### 3.4 Reconexão (C3) — modelo híbrido

- **Negócio:** mesma consulta e mesmo `sessionId` na capability.
- **Provider:** preferir mesma room; token novo na reentrada.
- **Mídia:** sempre revalidada — capability retorna a `mídia_pendente` até confirmar bidirecional novamente.
- **Grace period:** adiado (não bloqueia MVP).

### 3.5 Migração

- **Cutover no go-live do reboot** — sem dual stack no legado.
- Go Rooms permanece até desligar com o reboot.

---

## 4. Spike de provider — síntese

### 4.1 Shortlist e eliminados

**Shortlist MVP:** GetStream Video, Daily.co, LiveKit (Cloud + self-host P1).

**Eliminados:** Twilio Go Rooms (EOL), 100ms (SDK Node beta), mediasoup/Janus (gap RN), P2 in-house (prazo/TCO), Amazon Chime (RN imaturo).

### 4.2 Classes de solução

| Classe | Descrição | Papel no programa |
|--------|-----------|-------------------|
| **P0** | CPaaS gerenciado | **MVP go-live** |
| **P1** | LiveKit self-host (Docker/AWS) | Médio prazo; gatilho em volume 10× ou soberania |
| **P2** | WebRTC in-house | **Adiado** |

### 4.3 Adapter de provider

Contrato interno `IVideoProvider` na capability — permite trocar vendor sem reescrever regras de sessão. Detalhes em [SPIKE-PROVIDER §7](../SPIKE-PROVIDER.md#7-interface-ivideoprovider-rascunho).

---

## 5. Resultados das PoCs

Repositório: `poc-videoconsulta/` · Evidências: [RESULTADOS-POC.md](../poc-videoconsulta/docs/RESULTADOS-POC.md)

| Prova | Descrição | GetStream (A) | LiveKit (B) |
|-------|-----------|---------------|-------------|
| **P1** | Áudio+vídeo bidirecional | ✅ | ✅ |
| **P2** | Webhook antes de `ativa` | ✅ | ✅ |
| **P3** | UI não mostra ativa sem P2 | ✅ | ✅ |
| **P4** | Rejoin C3 (Expo/RN) | ✅ | ✅ |
| **P5** | Rejoin bloqueado após encerrar (C4) | ✅ | ✅ |
| **P6** | Sem sessão órfã | ✅ | ✅ |
| **E2E** | NestJS + Angular + RN | ✅ | ✅ |

**Daily.co (plan C):** não executado — desnecessário após pass duplo.

**Conclusão técnica:** ambos os finalistas **suprem os requisitos obrigatórios** do projeto.

---

## 6. Comparativo de custos

Estimativas com pricing público (mai/2026). GetStream em valor **bruto** (sem crédito promocional US$ 100/mês). LiveKit inclui bandwidth estimado (~500 kbps/participante, ~270 GB/mês no baseline).

Fontes: [GetStream pricing guide](https://getstream.io/video/docs/api/pricing-guide/) · [LiveKit pricing](https://livekit.com/pricing)

### 6.1 Premissas

| Variável | Valor |
|----------|-------|
| Participant-minutes/mês (baseline) | 72.000 |
| GetStream SD | US$ 0,75 / 1.000 participant-min |
| GetStream HD (720p) | US$ 1,50 / 1.000 participant-min |
| LiveKit Ship | US$ 50/mês + 150k WebRTC min incl. + bandwidth |

### 6.2 Tabela comparativa (US$/mês, bruto)

| Cenário | Participant-min/mês | GetStream SD | GetStream HD | LiveKit Build | LiveKit Ship |
|---------|---------------------|--------------|--------------|---------------|--------------|
| **Baseline** (20/dia) | 72.000 | 54 | 108 | ~60 | **~52** |
| **2×** (40/dia) | 144.000 | 108 | 216 | ~128 | **~85** |
| **10×** (200/dia) | 720.000 | **540** | 1.080 | ~676 | ~629 |

### 6.3 Leitura por volume

| Volume | Menor custo entre finalistas | Observação |
|--------|------------------------------|------------|
| Baseline | **LiveKit Ship** (~US$ 52) | GetStream HD ~2× mais caro |
| 2× | **LiveKit Ship** (~US$ 85) | GetStream SD (~US$ 108) ainda acima |
| 10× | GetStream SD (~US$ 540) vs LiveKit Ship (~US$ 629) | HD GetStream inviável; gatilho **P1 self-host** |

**Referência:** Daily.co ~US$ 248/mês (baseline) · LiveKit self-host P1 ~US$ 150–400 fixo + engenharia.

**Não modelado:** no-show/lobby, gravação, add-ons (noise cancellation), crédito GetStream US$ 100/mês.

---

## 7. Matriz de decisão — provider MVP

| Critério | Peso | GetStream Video | LiveKit Cloud |
|----------|------|-----------------|---------------|
| Anti-desencontro (PoC) | Alto | ✅ | ✅ |
| C3 mobile (PoC) | Alto | ✅ | ✅ |
| Stack §0.6 | Alto | ✅ | ✅ |
| **Custo OPEX baseline** | Médio | ~US$ 108/mês (HD) | **~US$ 52/mês** |
| H3 ecossistema Dr Clin | Baixo | **Favorável** | Neutro |
| Lock-in / caminho P1 | Médio | Médio | **Forte** (OSS) |
| Operação / SRE WebRTC | Médio | SaaS gerenciado | SaaS gerenciado |

### Critérios de desempate sugeridos

1. **Prioridade custo previsível no baseline** → LiveKit Cloud (Ship).
2. **Prioridade familiaridade vendor / conta ecossistema** → GetStream Video.
3. **Prioridade soberania / self-host no médio prazo** → LiveKit Cloud (caminho P1 sem trocar SDKs).
4. **Qualidade mínima aceita SD vs HD** → impacta custo GetStream significativamente.

---

## 8. Riscos e pendências

| Item | Impacto | Status |
|------|---------|--------|
| Escolha final GetStream vs LiveKit | Bloqueia ADR-003 Aceito e adapter produção | 🟡 Pendente |
| Taxa de no-show (`P_no_show`) | Refina modelo de custo (lobby) | 🟡 Pendente |
| Compliance LGPD / DPA por vendor | Go-live | 🟡 Paralelizar com jurídico |
| SLA numérico (reconexão, lobby) | Operação | 🔴 Aberto |
| Grace period C3 | UX pós-queda | ⏸️ Adiado |
| Valores C2 (lobby, timeout) | Regra do consumidor | ⏸️ Adiado |
| Runbooks operacionais | SRE | 🔴 Gap |
| Gravação de vídeo | Escopo | ✅ Fora de MVP |

---

## 9. ADRs e gates

| ADR | Título | Status |
|-----|--------|--------|
| [ADR-001](./adr/ADR-001-colocacao-videoconsulta.md) | Colocação da capability (H2) | Proposto |
| [ADR-002](./adr/ADR-002-implementacao-h2.md) | Implementação H2 | Proposto |
| [ADR-003](./adr/ADR-003-provider-videoconsulta.md) | Provider de mídia | Proposto — PoC ok; provider pendente |

### Gate para implementação produção

1. ✅ Spike arquitetural (H2) definida.
2. ✅ PoC GetStream + LiveKit pass (P1–P6).
3. ⬜ Stakeholders escolhem provider MVP.
4. ⬜ ADR-003 → **Aceito**.
5. ⬜ Budget validado (comparativo §6).
6. ⬜ LGPD/DPA validado (paralelo).

---

## 10. Próximos passos

| # | Ação | Responsável sugerido |
|---|------|----------------------|
| 1 | Decidir **GetStream vs LiveKit** para MVP | Produto + Engenharia + stakeholders |
| 2 | Aceitar **ADR-003** com provider nomeado | Arquitetura |
| 3 | Validar **proposta de custo** §6 com financeiro | Produto / FinOps |
| 4 | Validar **DPA/LGPD** com vendor escolhido | Segurança / Jurídico |
| 5 | Iniciar implementação `IVideoProvider` + capability H2 no reboot | Engenharia |
| 6 | (Opcional) PoC **LiveKit self-host** em staging Docker | Plataforma / SRE |
| 7 | Definir runbooks mínimos (sessão presa, C3, C4) | SRE + Engenharia |

---

## 11. Referências

| Documento | Conteúdo |
|-----------|----------|
| [SPIKE.md](../SPIKE.md) | Spike arquitetural completa — H1/H2/H3, estados, C1–C4 |
| [SPIKE-PROVIDER.md](../SPIKE-PROVIDER.md) | Shortlist, matriz, custos, PoC, `IVideoProvider` |
| [SPIKE-H2.md](../SPIKE-H2.md) | Como implementar a capability — contrato, deploy |
| [PRD.md](../PRD.md) | Requisitos de produto |
| [GLOSSARIO.md](../GLOSSARIO.md) | Termos e siglas |
| [PLANO-POC-PROVIDER.md](./poc/PLANO-POC-PROVIDER.md) | Plano de execução das PoCs |
| [RESULTADOS-POC.md](../poc-videoconsulta/docs/RESULTADOS-POC.md) | Resultados detalhados P1–P6 |

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-05-26 | Criação do resumo executivo — consolida spike arquitetural, provider, PoCs e comparativo de custos |
