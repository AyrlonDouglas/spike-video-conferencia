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

**Reboot da Api.Saúde:** a plataforma está sendo reconstruída. Videoconsulta é capability **core** — mantê-la no legado contradiz a intenção do reboot. A capability desacoplada (H2) integra-se ao programa de reboot; a Api.Saúde rebootada consome via contrato, sem herdar acoplamento Twilio.

Cenários críticos: conexão e consulta (~60 min), no-show, reconexão, encerramento com veto de reentrada do paciente.

**Contexto levantado na spike (ver [SPIKE.md §0](../../SPIKE.md)):**

- ~20 consultas/dia, ~60 min, sempre 2 participantes (1:1), N em paralelo
- Paciente mobile-first; profissional e backoffice desktop + responsivo
- Budget: proposta paramétrica → validação stakeholders
- Realtime do ecossistema (GetStream): **apenas chat** — vídeo usa **SDKs diferentes** e exige módulos novos no backend e frontend (não é habilitar feature)
- **H1 rejeitada:** legado acoplado — acoplamento, desencontros, manutenção arriscada, artifícios Twilio; **incompatível com reboot**
- **Desencontro:** médico e paciente na chamada, mas sem se ver/ouvir (falha de mídia, não só de lobby)
- **Estado da sessão:** capability H2 = fonte da verdade; Api.Saúde = consulta de negócio; provider = fatos de mídia
- **Ordem de entrada:** paciente pode entrar primeiro; aguarda médico; capability trata ordem como simétrica (`aguardando` = 1/2)
- **Fora de escopo:** gravação de vídeo no MVP / spike
- **C3:** modelo híbrido de reconexão (§3.2.2); grace period **adiado**
- **PoC:** valida arquitetura **nova**; **não** reproduz desencontros do legado Api.Saúde
- **C4:** só médico veta; paciente tardio não entra na sala
- **Migração:** cutover com reboot Api.Saúde; sem integração no legado
- **C2:** timeout/encerramento = regra do consumidor; valores adiados
- **Diagrama de estados (§7):** validado

---

## Decisão

**Abordagem escolhida:** ~~H1 — Acoplada à Api.Saúde~~ · **H2 — Capability desacoplada**

**Fonte da verdade do estado da sessão:** **Capability de vídeo (H2)** — estados `criada` → `aguardando` → `mídia_pendente` → `ativa` → `encerrada` / `vetada`. Api.Saúde orquestra negócio e emite comandos; provider informa fatos de mídia via webhooks; clientes nunca são fonte da verdade. Ver [SPIKE.md §3.2.1](../../SPIKE.md).

**Política de reconexão (C3):** **Modelo híbrido** — mesma sessão de negócio na capability; preferir mesma room do provider; transição `ativa` → `mídia_pendente` na queda; mídia bidirecional revalidada antes de retornar a `ativa`; nova room apenas como fallback. **Grace period:** adiado (fora desta rodada). Ver [SPIKE.md §3.2.2](../../SPIKE.md).

**C4:** apenas médico encerra/veta (via Api.Saúde); paciente tardio **não entra** na sala — estado `vetada`.

**C2:** timeout de lobby e quem encerra = **regra do consumidor** (Api.Saúde); capability expõe mecanismo. Valores concretos adiados. Ver [SPIKE.md §0.5](../../SPIKE.md).

**Migração Twilio:** entrega **junto com reboot** da Api.Saúde; **não** integrar na Api.Saúde legada — cutover no go-live.

---

## Critérios considerados

Referência completa: [SPIKE.md — seções 3 e 4](../../SPIKE.md).

| Critério | Peso | H1 | H2 | Comentário |
|----------|------|----|----|------------|
| Time-to-MVP | 2 | Favorável | Neutro | ~20 consultas/dia; escopo 1:1 simples favorece acoplamento inicial, mas reboot exige reconstrução de qualquer forma |
| Reuso multi-produto | 3 | Desfavorável | Favorável | Objetivo explícito do PRD; legado acoplado inviabiliza reuso no ecossistema Clin&Co |
| Consistência de sessão (C2–C4) | 3 | Desfavorável | Favorável | H1 concentra negócio + mídia; H2 orquestra estados com fronteira clara e `mídia_pendente` |
| Anti-desencontro (mídia estabelecida) | 3 | Desfavorável | Favorável | Legado mistura “na sala” com “ativa”; H2 exige mídia bidirecional confirmada antes de `ativa` |
| Custo em escala | 1 | Neutro | Neutro | Volume baixo (~20/dia); custo direto de mídia não domina decisão de colocação no MVP |
| Operação / suporte | 2 | Desfavorável | Favorável | Capability dedicada: runbooks, ownership e correlação consulta/sessão mais claros |
| Flexibilidade / lock-in | 2 | Desfavorável | Favorável | H2 permite trocar provider de mídia e evoluir contrato; H1 repete lock-in Twilio + Api.Saúde |
| Manutenibilidade | 3 | Desfavorável | Favorável | Legado: artifícios de custo Twilio, medo de alterar, alto risco de regressão |
| Alinhamento reboot Api.Saúde | 3 | Desfavorável | Favorável | Core no legado contradiz reboot; videoconsulta entra via H2 no go-live |
| Migração Twilio | 2 | Desfavorável | Favorável | Cutover com reboot; nova capability **não** integrada no legado (§0.5) |
| Evolução / deploy independente | 2 | Desfavorável | Favorável | Vídeo é net-new; capability evolui sem acoplar deploy da Api.Saúde |
| Clareza de ownership | 2 | Neutro | Favorável | Capability dedicada facilita responsabilidade operacional de sessão/mídia |

_Escala: **Favorável** / **Neutro** / **Desfavorável** — consolidado de [SPIKE.md §3.3 e §4](../../SPIKE.md). **H1 rejeitada** em todos os critérios com peso 3._

---

## Consequências

### Positivas

- Estado de sessão centralizado na capability — reduz desencontros entre 3 clientes
- Fronteira clara: Api.Saúde (negócio) vs capability (sessão/mídia) vs provider (fatos técnicos)
- `mídia_pendente` separa “na sala” de “consulta ativa” — mitiga desencontro documentado

### Negativas / trade-offs aceitos

- Capability adicional para operar e evoluir (vs monolito)
- PoC necessário para confirmação de mídia bidirecional por provider

### Follow-ups

- [ ] Cumprir [SPIKE.md §11](../../SPIKE.md#11-definition-of-done--encerramento-da-spike-arquitetural) e aceitar ADR
- [ ] [SPIKE-H2.md](../../SPIKE-H2.md) — como implementar capability (em andamento)
- [ ] PoCs listados em [SPIKE.md §9](../../SPIKE.md#9-escopo-do-poc-futuro-fase-pós-spike-arquitetural) — sem PoC de desencontro legado
- [ ] Contrato negócio × vídeo publicado (interno)

---

## Alternativas rejeitadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| **H1 — Acoplada à Api.Saúde / legado** | Acoplamento; desencontros; manutenção arriscada; artifícios Twilio; **core no legado incompatível com reboot da Api.Saúde** |
| Manter videoconsulta no legado durante reboot | Contradiz intenção do reboot; nova Api.Saúde continuaria dependente da base obsoleta |
| Estado de sessão no cliente ou só no provider | Cliente = desencontros; provider = não conhece regras C4/veto |
| Reconexão mantendo `ativa` sem revalidar mídia | Reproduz desencontro documentado no legado |
| Nova room provider a cada queda | Fragmenta sessão; risco de participantes em salas distintas |
| Api.Saúde como fonte da verdade de sessão de vídeo | Repete acoplamento H1; mistura negócio com mídia |

---

## Notas

**Desencontro (definição acordada):** médico e paciente estão na chamada de vídeo (UI/estado indicam presença), mas não se veem nem se ouvem. A nova arquitetura deve separar “na sessão” de “mídia estabelecida” — ver [SPIKE.md §0 e §7](../../SPIKE.md).
