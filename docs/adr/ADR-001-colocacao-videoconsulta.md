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
- **Reboot:** videoconsulta entra na nova arquitetura via H2; Api.Saúde = negócio; capability = sessão/mídia

---

## Decisão

> _Spike em andamento — colocação definida; detalhes de implementação pendentes._

**Abordagem escolhida:** ~~H1 — Acoplada à Api.Saúde~~ · **H2 — Capability desacoplada** · ⬜ Híbrida — _descrever_

**Fonte da verdade do estado da sessão:** _Pendente — inclinação: capability dedicada, com distinção sessão ativa vs mídia estabelecida_

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
| **H1 — Acoplada à Api.Saúde / legado** | Acoplamento; desencontros; manutenção arriscada; artifícios Twilio; **core no legado incompatível com reboot da Api.Saúde** |
| H2 — _se rejeitada_ | |
| Manter videoconsulta no legado durante reboot | Contradiz intenção do reboot; nova Api.Saúde continuaria dependente da base obsoleta |
| Reutilizar solução acoplada atual | Mesmos problemas de H1 |

---

## Notas

**Desencontro (definição acordada):** médico e paciente estão na chamada de vídeo (UI/estado indicam presença), mas não se veem nem se ouvem. A nova arquitetura deve separar “na sessão” de “mídia estabelecida” — ver [SPIKE.md §0 e §7](../../SPIKE.md).
