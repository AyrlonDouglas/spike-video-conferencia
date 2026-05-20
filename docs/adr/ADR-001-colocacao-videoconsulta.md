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

---

## Decisão

> _Spike em andamento — colocação definida; detalhes de implementação pendentes._

**Abordagem escolhida:** ~~H1 — Acoplada à Api.Saúde~~ · **H2 — Capability desacoplada** · ⬜ Híbrida — _descrever_

**Fonte da verdade do estado da sessão:** **Capability de vídeo (H2)** — estados `criada` → `aguardando` → `mídia_pendente` → `ativa` → `encerrada` / `vetada`. Api.Saúde orquestra negócio e emite comandos; provider informa fatos de mídia via webhooks; clientes nunca são fonte da verdade. Ver [SPIKE.md §3.2.1](../../SPIKE.md).

**Política de reconexão (C3):** _mesma sessão técnica / nova sessão com continuidade de negócio — pendente_

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
| Manutenibilidade | | | | |
| Alinhamento reboot Api.Saúde | | | | Core no legado fugiria da intenção |
| Migração Twilio | | | | |

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

- [ ] PoCs listados em [SPIKE.md §9](../../SPIKE.md#9-escopo-do-poc-futuro-fora-desta-fase)
- [ ] Unknowns da [SPIKE.md §5](../../SPIKE.md) resolvidos ou com dono
- [ ] Contrato negócio × vídeo publicado (interno)

---

## Alternativas rejeitadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| **H1 — Acoplada à Api.Saúde / legado** | Acoplamento; desencontros; manutenção arriscada; artifícios Twilio; **core no legado incompatível com reboot da Api.Saúde** |
| H2 — _se rejeitada_ | |
| Manter videoconsulta no legado durante reboot | Contradiz intenção do reboot; nova Api.Saúde continuaria dependente da base obsoleta |
| Estado de sessão no cliente ou só no provider | Cliente = desencontros; provider = não conhece regras C4/veto |
| Api.Saúde como fonte da verdade de sessão de vídeo | Repete acoplamento H1; mistura negócio com mídia |

---

## Notas

**Desencontro (definição acordada):** médico e paciente estão na chamada de vídeo (UI/estado indicam presença), mas não se veem nem se ouvem. A nova arquitetura deve separar “na sessão” de “mídia estabelecida” — ver [SPIKE.md §0 e §7](../../SPIKE.md).
