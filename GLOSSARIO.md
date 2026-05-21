# Glossário — Spike videoconsulta (Clin&Co)

Referência rápida de siglas, abreviações e termos usados em [SPIKE.md](./SPIKE.md), [SPIKE-H2.md](./SPIKE-H2.md), [SPIKE-PROVIDER.md](./SPIKE-PROVIDER.md), [PRD.md](./PRD.md) e ADRs.

---

## Produtos e organização

| Termo | Significado |
|-------|-------------|
| **Clin&Co** | Ecossistema de produtos de saúde (Api.Saúde, Dr Clin, etc.). |
| **Api.Saúde** | Produto principal desta spike — consultas online; **primeiro consumidor** da capability de vídeo. |
| **Api.Saúde rebootada** / **reboot** | Nova versão da plataforma em reconstrução; videoconsulta entra como capability **core**, não no legado. |
| **Api.Saúde legada** | Implementação atual com vídeo acoplado (Go Rooms / Twilio). |
| **Dr Clin** | Outro produto do ecossistema; usa **GetStream para chat** (não vídeo). Api.Saúde **não** usa esse chat. |
| **Time de plataforma** | Engenharia transversal que pode **operar** a capability H2 (ex.: microserviço dedicado). |
| **Produto plataforma** | Suite/backbone unificado de capabilities — **não existe hoje** (diferente do “time de plataforma”). |

---

## Documentos e artefatos

| Termo | Significado |
|-------|-------------|
| **PRD** | Product Requirements Document — [PRD.md](./PRD.md). |
| **SPIKE** / **spike** | Investigação com critérios e evidências antes de implementar. |
| **SPIKE.md** | Spike **arquitetural** — H1/H2/H3, estados, C1–C4, anti-desencontro. |
| **SPIKE-H2** | Spike de **implementação** — contrato, colocação, deploy, adapter. |
| **SPIKE-PROVIDER** | Spike de **provider de mídia** — vendor, P0/P1/P2, custo, PoC. |
| **ADR** | Architecture Decision Record — decisão registrada em `docs/adr/`. |
| **ADR-001** | Colocação: capability **H2** desacoplada. |
| **ADR-002** | Como implementar H2 (contrato, persistência, adapter). |
| **ADR-003** | Qual provider/caminho de mídia no MVP. |
| **PoC** | Proof of Concept — protótipo para validar hipóteses (ex.: C3 mobile, anti-desencontro). |
| **§** | Seção do documento (ex.: §3.2.1 = seção 3.2.1). |

---

## Hipóteses de arquitetura (PRD / SPIKE)

| Sigla | Nome | Resumo |
|-------|------|--------|
| **H1** | Solução acoplada à Api.Saúde | Vídeo dentro do monólito/legado. **Rejeitada** — desencontros, reboot incompatível. |
| **H2** | Capability desacoplada | Serviço/módulo de videoconsulta reutilizável; **fonte da verdade** do estado da sessão. **Direção escolhida.** |
| **H3** | Reuso do ecossistema (GetStream) | Familiaridade com vendor do chat no Dr Clin. **Ganho limitado** para vídeo — SDKs e módulos são novos. |

---

## Hipóteses de colocação da capability (SPIKE-H2)

| Sigla | Significado |
|-------|-------------|
| **H2-A** | Microserviço NestJS dedicado (`videoconsulta`), deploy independente. |
| **H2-A′** (A prima) | H2-A + operado pelo **time de plataforma**; Api.Saúde consome via **M2M**. **Inclinação atual.** |
| **H2-B** | Módulo / bounded context **dentro** do programa de reboot da Api.Saúde. |
| **H2-C** | Capability em “produto plataforma” compartilhado. **Descartada como org.** — premissa fraca hoje. |
| **Híbrido B→A′** | Começa como H2-B no MVP; extrai para microserviço depois (com critérios §2.3). |

---

## Hipóteses de provider de mídia (SPIKE-PROVIDER)

| Sigla | Significado |
|-------|-------------|
| **P0** | **CPaaS gerenciado** — Daily, GetStream Video, LiveKit Cloud, etc. Vendor opera TURN/SFU e billing por minuto. |
| **P1** | **SFU self-host** — ex.: LiveKit no nosso cluster; “próprio” = infra + SRE, não protocolo do zero. |
| **P2** | **WebRTC in-house** — signaling NestJS + coturn + P2P; máximo controle, **adiado** no MVP. |
| **Provider** / **vendor** | Camada externa de **mídia** (rooms, tokens WebRTC, webhooks). Informa fatos; capability **decide** estado. |
| **Adapter** | Implementação de `IVideoProvider` por vendor — isola lock-in. |
| **IVideoProvider** | Interface interna da capability (criar room, token, webhooks, etc.). |

---

## Cenários de produto (C1–C4)

| Sigla | Cenário (PRD) | Responsabilidade típica |
|-------|---------------|-------------------------|
| **C1** | Médico e paciente conectam; consulta ~60 min | Duração, entrada na sala (paciente pode entrar primeiro). |
| **C2** | No-show — um entra, o outro não | **Regra do consumidor** (Api.Saúde); capability só **mecanismo** (timeout, encerrar). |
| **C3** | Reconexão após queda de rede | Modelo **híbrido**: mesma sessão de negócio; preferir mesma **room**; revalidar `mídia_pendente`. |
| **C4** | Médico encerra e **veta**; paciente tardio não entra | Estado `vetada`; só médico encerra/veta. |

---

## Estados da sessão (capability H2)

| Estado | Significado |
|--------|-------------|
| `criada` | Sessão criada; ainda sem participantes na mídia. |
| `aguardando` | Lobby — um ou dois no fluxo de entrada; esperando o par (1/2). |
| `mídia_pendente` | Participantes na sala/provider, mas **mídia bidirecional ainda não confirmada** (anti-desencontro). |
| `ativa` | Consulta em andamento — áudio/vídeo bidirecional **confirmados**. |
| `encerrada` | Sessão finalizada normalmente. |
| `vetada` | Encerrada com veto (C4) — paciente não pode reentrar. |

---

## Termos de domínio e problema

| Termo | Significado |
|-------|-------------|
| **Capability** | Funcionalidade desacoplada e reutilizável (aqui: videoconsulta H2). |
| **Consumidor** | Produto que usa a capability via contrato — ex.: **Api.Saúde rebootada**. |
| **Desencontro** | Médico e paciente “na chamada” (UI ok), mas **não se veem/ouvem** — falha de mídia, não só lobby. |
| **Anti-desencontro** | Regra: só ir a `ativa` após confirmação de mídia bidirecional (webhooks/provider). |
| **Lobby** | Fase `aguardando` antes dos dois estarem prontos para consulta ativa. |
| **No-show** | Um participante não entra (C2). |
| **Grace period** | Janela após queda antes de encerrar sessão (C3) — **adiado** na spike. |
| **Cutover** | Troca **no go-live do reboot** — sem integrar vídeo novo no legado. |
| **Go Rooms** | Tipo de sala Twilio legada (P2P 1:1); baseline atual; **EOL** no Programmable Video. |
| **1:1** | Sempre dois participantes: profissional + paciente (sem multiparty no MVP). |
| **MVP** | Minimum Viable Product — fatia mínima com o reboot. |

---

## Papéis na arquitetura

| Papel | O que faz |
|-------|-----------|
| **Api.Saúde (negócio)** | Agenda, autorização, regras C1–C4, comandos (`Create`, `End`, `Veto`). |
| **Capability H2** | Orquestra estado da sessão; emite tokens; processa webhooks; **fonte da verdade**. |
| **Provider de mídia** | Rooms WebRTC, TURN, streams; envia **fatos** (conectou, publicou track). |
| **Cliente** | Angular (profissional/backoffice) ou React Native (paciente) — **nunca** fonte da verdade de estado. |

---

## Siglas técnicas

| Sigla | Significado |
|-------|-------------|
| **API** | Application Programming Interface. |
| **SDK** | Software Development Kit — biblioteca do provider nos clientes/backend. |
| **M2M** | Machine-to-Machine — comunicação serviço-a-serviço (ex.: Api.Saúde → capability com JWT/API keys). |
| **BFF** | Backend for Frontend — Api.Saúde no caminho do join no MVP (inclinação). |
| **WebRTC** | Web Real-Time Communication — áudio/vídeo no browser/app. |
| **SFU** | Selective Forwarding Unit — servidor que encaminha mídia (1:N); usado em 1:1 via providers. |
| **P2P** | Peer-to-peer — mídia direta entre dois peers (ex.: Go Rooms, P2). |
| **TURN** | Traversal Using Relays around NAT — relay quando P2P direto falha. |
| **STUN** | Session Traversal Utilities for NAT — descobre endereço público. |
| **coturn** | Servidor TURN/STUN open source (citado em P2). |
| **CPaaS** | Communications Platform as a Service — Daily, Vonage, GetStream Video, etc. |
| **REST** / **gRPC** | Estilos de API avaliados para o contrato da capability. |
| **SSE** | Server-Sent Events — opção para sync de estado com clientes. |
| **WS** | WebSocket — opção para sync de estado com clientes. |
| **TTL** | Time To Live — expiração de token/sala. |
| **EOL** | End of Life — fim de suporte (Twilio Programmable Video, dez/2024). |
| **RN** | React Native — app mobile do paciente. |
| **JWT** | JSON Web Token — auth M2M e tokens de join (provisório). |

---

## Operação, custo e compliance

| Sigla | Significado |
|-------|-------------|
| **SRE** | Site Reliability Engineering — operação, on-call, infra. |
| **TCO** | Total Cost of Ownership — custo variável + fixo (engenharia, infra, SRE). |
| **OPEX** | Operational Expenditure — custo recorrente (ex.: por minuto do CPaaS). |
| **capex** | Capital/expenditure de engenharia inicial (ex.: construir P2). |
| **SLA** | Service Level Agreement — acordo de nível de serviço. |
| **SLI** | Service Level Indicator — métrica (ex.: % reconexão ok). |
| **LGPD** | Lei Geral de Proteção de Dados — compliance Brasil. |
| **DPA** | Data Processing Agreement — contrato de tratamento de dados com vendor. |
| **BAA** | Business Associate Agreement — contexto HIPAA (EUA), se aplicável. |
| **HIPAA** | Regulamentação de saúde EUA — citada como referência internacional. |
| **Runbook** | Procedimento operacional para incidentes (sessão presa, C2, C3, etc.). |

---

## Variáveis do modelo de custo (SPIKE §3.5)

| Símbolo | Significado |
|---------|-------------|
| `N_dia` | Consultas por dia (~20). |
| `T_med` | Duração média da consulta em minutos (~60). |
| `P_sess` | Participantes por sessão (2, fixo). |
| `P_no_show` | Taxa de no-show (C2) — pendente. |
| `P_recon` | Taxa de reconexão por consulta — pendente. |
| `T_lobby` | Minutos em lobby antes de no-show/encerrar — adiado. |
| `custo_minuto` / **participant-minute** | Unidade de cobrança típica dos CPaaS (minuto × participante). |

---

## Vendors e tecnologias citados

| Nome | Contexto no repositório |
|------|-------------------------|
| **Twilio** | Legado Go Rooms; Programmable Video em EOL. |
| **GetStream** | Chat no Dr Clin; **GetStream Video** = produto distinto (SDKs novos). |
| **Daily.co** | CPaaS candidato; plan B do provider. |
| **Amazon Chime SDK** | CPaaS AWS; **long list only** — não shortlist (RN via SDK nativo/demo). |
| **100ms** | CPaaS avaliado na long list; **eliminado** — Server SDK Node em beta (knockout NestJS). |
| **LiveKit** | Cloud (P0) ou self-host (P1); PoC B Cloud; self-host via Docker — TURN embutido (§2.5 SPIKE-PROVIDER). |
| **Vonage** | Ex-TokBox; long list, fora da shortlist final. |
| **Agora** | CPaaS; long list. |
| **mediasoup** / **Janus** | SFU open source; eliminados vs LiveKit para RN. |
| **Zoom Video SDK** | Recomendação Twilio pós-EOL; long list. |

---

## Status nos documentos (emoji)

| Símbolo | Significado |
|---------|-------------|
| 🟢 | Decidido / concluído / desk research ok |
| 🟡 | Parcial / inclinação / pendente confirmação |
| 🔴 | Aberto |
| ⬜ | Checklist não marcado |
| ✅ | Checklist marcado / favorável |
| ❌ | Rejeitado / desfavorável |
| ➖ | Neutro |
| ⏸️ | Adiado (ex.: grace period, valores C2) |

---

## Fluxos e operações (contrato H2)

| Termo | Significado |
|-------|-------------|
| **CreateSession** | Consumidor cria sessão (`criada`). |
| **JoinSession** | Entrada na sala; emite credencial; transição lobby/mídia. |
| **GetSession** | Leitura do estado (nunca autoritativa no cliente). |
| **EndSession** | Encerra (`encerrada`). |
| **VetoSession** | Veto C4 (`vetada`). |
| **ConfigureLobbyPolicy** | Consumidor configura timeout C2 (mecanismo na capability). |
| **consultaId** | ID externo da consulta no Api.Saúde. |
| **sessionId** | ID da sessão na capability. |
| **providerRoomId** | ID da sala/room no provider de mídia. |

---

## Leitura sugerida por dúvida

| Se você quer entender… | Abra |
|------------------------|------|
| Por que H2 e não H1 | [SPIKE.md §0, §4](./SPIKE.md) · [ADR-001](./docs/adr/ADR-001-colocacao-videoconsulta.md) |
| Estados e desencontro | [SPIKE.md §3.2.1, §7](./SPIKE.md) |
| Onde deployar a capability | [SPIKE-H2.md §2](./SPIKE-H2.md) |
| Qual Twilio/GetStream/Daily | [SPIKE-PROVIDER.md](./SPIKE-PROVIDER.md) · [ADR-003](./docs/adr/ADR-003-provider-videoconsulta.md) |
| O que testar no PoC | [docs/poc/PLANO-POC-PROVIDER.md](./docs/poc/PLANO-POC-PROVIDER.md) |

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-05-21 | Criação do glossário |
| 2026-05-21 | **100ms** — eliminado (SDK Node beta) |
| 2026-05-21 | **Amazon Chime SDK** — long list only |
