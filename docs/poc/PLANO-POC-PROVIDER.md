# Plano de execução — PoC provider (finalistas A e B)

> Referência: [SPIKE-PROVIDER.md §6](../../SPIKE-PROVIDER.md#6-poc--escopo-finalistas-e-critérios) · [ADR-003](../adr/ADR-003-provider-videoconsulta.md)

## Finalistas

| Slot | Provider | Conta trial |
|------|----------|-------------|
| **A** | GetStream Video | [Dashboard Stream](https://getstream.io/) |
| **B** | LiveKit Cloud | [LiveKit Cloud](https://cloud.livekit.io/) |

**Plan B (se A falhar):** Daily.co — [dashboard Daily](https://dashboard.daily.co/)

## LiveKit self-host (opcional, Docker)

Se PoC **B (Cloud)** passar e o time quiser validar **P1** sem mudar SDKs:

- [LiveKit deployment](https://docs.livekit.io/transport/self-hosting/deployment/) — compose em **staging** na AWS
- Mesmo checklist §6.3 (TLS + TURN na config; teste RN em rede real)
- Não substitui PoC A/B obrigatórios para fechar ADR-003

## Estrutura sugerida do repositório PoC

```
poc-videoconsulta/
  apps/
    orchestrator/     # NestJS — tokens, webhooks, estado mídia_pendente/ativa
    web-profissional/ # Angular — join médico
    mobile-paciente/  # React Native — join paciente + teste C3
  packages/
    provider-getstream/
    provider-livekit/
```

## Checklist por finalista

### Setup

- [ ] Conta trial + API keys
- [ ] Webhook endpoint público (ngrok/cloud) para eventos mídia
- [ ] Room create + token server-side (NestJS)

### Provas (registrar em SPIKE-PROVIDER §6.6)

| ID | Prova | Pass? | Notas |
|----|-------|-------|-------|
| P1 | Dois participantes conectam áudio+vídeo | | |
| P2 | Webhook/API confirma **ambos** com track antes de `ativa` | | |
| P3 | UI não mostra “consulta ativa” sem P2 | | |
| P4 | Queda de rede no RN → rejoin mesma room | | |
| P5 | Após encerrar, rejoin bloqueado (C4 mock) | | |
| P6 | Room destruída / TTL — sem sessão órfã | | |

### C3 (mobile)

- [ ] Simular background/4G instável no dispositivo paciente
- [ ] Verificar transição `ativa` → `mídia_pendente` → `ativa` com revalidação

## Critério go/no-go

**Go para ADR-003 Aceito + implementação adapter:**

- Finalista A: P1–P5 **pass**
- Se A falha P4 ou P2: executar plan B (Daily) ou promover B (LiveKit) com mesma checklist

## Atualização pós-PoC

1. Preencher [SPIKE-PROVIDER.md §6.6](../../SPIKE-PROVIDER.md#66-resultados-poc)
2. Atualizar [ADR-003](../adr/ADR-003-provider-videoconsulta.md) — Status → **Aceito**
3. Desbloquear implementação `IVideoProvider` no programa reboot
