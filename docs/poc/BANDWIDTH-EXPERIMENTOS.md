# PoC — Experimentos de bandwidth (LiveKit)

| Campo | Valor |
|-------|-------|
| **Objetivo** | Medir o ganho de cada ajuste de forma **atômica** (uma mudança por vez) |
| **Cenário** | Videoconsulta 1:1 — `mobile-paciente` + `web-profissional` |
| **Baseline** | `new Room()` sem opções · `VideoView` · defaults de publicação |
| **Status** | Exp 3 implementado (`dynacast` + h360 em ambos) · aguardando medição |

---

## Regra de ouro

1. **Um experimento = um commit** (ou branch) — facilita reverter e comparar.
2. **Sempre repetir o mesmo roteiro de teste** (§3) após cada mudança.
3. **Não combinar** adaptive stream + dynacast + h360 no mesmo passo.
4. Anotar **qual app** foi alterado (só paciente, só médico, ou ambos).

---

## Primeiro passo (faça antes de qualquer código)

### Exp 0 — Baseline (sem mudanças)

**O que fazer:** rodar uma consulta de **3 minutos** com o código atual (paciente publica câmera + mic, médico idem, vídeo em tela cheia nos dois lados).

**Por quê primeiro:** sem baseline, não dá para saber se o próximo passo melhorou ou piorou.

**Como medir (escolha pelo menos 2 fontes):**

| Fonte | Onde | O que anotar |
|-------|------|----------------|
| **LiveKit Cloud** | Dashboard → Room / Analytics | Bytes in/out da room, duração, participantes |
| **Web (médico)** | Chrome → `chrome://webrtc-internals` → aba da peer connection | `bytesSent` / `bytesReceived` (screenshot no min 1 e min 3) |
| **Subjetivo** | — | Qualidade 1–5 (áudio e vídeo), travamentos sim/não |

**Preencher:** linha `Exp 0` na tabela §4.

Só depois disso avance para **Exp 1**.

### Resultado registrado — Exp 0 (2026-05-27)

**Room LiveKit:** `RM_fd6nQgmSn6UF`

Fonte: **LiveKit Cloud** (métricas da room, 1:1 paciente + médico).

| Métrica | Valor | Normalizado (por minuto) |
|---------|-------|---------------------------|
| Duração | **64 min** | — |
| Upstream (room) | **2,18 GB** | ~34,1 MB/min (~4,5 Mbps médio*) |
| Downstream (room) | **1,55 GB** | ~24,2 MB/min (~3,2 Mbps médio*) |
| **Total** | **3,73 GB** | ~58,3 MB/min |

\* Mbps médio ≈ `(GB × 8000) / (min × 60)` — tráfego agregado da room (dois publicadores + dois assinantes via SFU).

**Extrapolação (mesma intensidade de uso):**

| Duração consulta | Upstream | Downstream | Total |
|------------------|----------|------------|-------|
| 3 min (roteiro doc) | ~102 MB | ~73 MB | ~175 MB |
| 15 min | ~510 MB | ~364 MB | ~874 MB |
| 30 min | ~1,02 GB | ~728 MB | ~1,75 GB |

**Notas:**

- Teste mais longo que o roteiro (3 min) — válido como baseline; nos próximos Exps use **a mesma duração (64 min)** *ou* compare sempre pela coluna **MB/min**.
- Upstream > Downstream é comum em 1:1 com defaults altos: os dois enviam vídeo (muitas vezes 720p + simulcast); o SFU contabiliza upload de cada lado.
- Qualidade subjetiva / `webrtc-internals` não preenchidos — opcional anotar depois.

---

## Ordem dos experimentos (atômicos)

Ordem pensada para: (a) mudança pequena no diff, (b) efeito mensurável em 1:1, (c) dependências explícitas.

| # | ID | Mudança | App | Arquivo(s) provável | Efeito esperado | Risco de “zero ganho” |
|---|-----|---------|-----|---------------------|-----------------|------------------------|
| 0 | `baseline` | Nenhuma | — | — | Referência | — |
| 1 | `publish-h360` | `videoCaptureDefaults` + `publishDefaults` → preset **h360** (~450 kbps) | **Só paciente** | `livekit-room.ts` ou factory `createConsultaRoom()` | ↓ uplink paciente, ↓ downlink no médico | Baixo |
| 2 | `publish-h360-both` | Mesmo que Exp 1 | **Paciente + web** | mobile + `livekit-room.ts` web | ↓ bandwidth total da room | Baixo |
| 3 | `dynacast` | `dynacast: true` no `Room` | Ambos | onde `new Room()` é criado | ↓ uplink quando camadas altas não são consumidas | **Alto em 1:1 tela cheia** — pode medir ~0% |
| 4 | `adaptive-stream` | `adaptiveStream: true` | Ambos | `new Room(...)` | ↓ downlink quando preview é pequeno | **Alto se UI continuar tela cheia** |
| 5 | `videotrack` | Trocar `VideoView` → `VideoTrack` + `trackRef` | **Só paciente** | `[sessionId].tsx` | Habilita adaptive stream de fato no RN | Necessário antes de validar Exp 4 no mobile |
| 6 | `adaptive-ui` | Layout: vídeo remoto grande + local em **picture-in-picture** pequeno | Paciente (e opc. web) | estilos / layout | Exp 4 e 5 passam a ter efeito visível | Baixo se layout mudar |
| 7 | `quality-low-remote` | No `TrackSubscribed`, `setVideoQuality(LOW)` no vídeo remoto | Quem **recebe** (ex.: só paciente) | listener da room | ↓ downlink desse cliente | Baixo em tela cheia (prefira com PiP) |
| 8 | `audio-red-off` | `red: false` ao publicar áudio | Um lado | publish de áudio | ↓ bandwidth áudio | Troca qualidade por dados |
| 9 | `profile-orchestrator` | `videoProfile` na sessão + metadata + clientes leem no join | Orchestrator + apps | sessions + join response | Política centralizada | Depende dos Exps 1–8 validados |

> **Nota:** Exps 3–4 podem não aparecer no dashboard em 1:1 com dois vídeos fullscreen — isso é esperado; anote “sem ganho mensurável” e siga. O valor está em confirmar **quando** cada knob funciona.

---

## Roteiro de teste fixo (repetir em todo Exp)

1. Reiniciar orchestrator e apps (cache limpo se possível).
2. Criar **nova** sessão (room nova no LiveKit).
3. Paciente entra → médico entra → **3 min** com ambos falando e movendo a câmera.
4. Mesma rede Wi‑Fi quando possível; anotar se usou 4G em algum lado.
5. Encerrar sessão; coletar métricas; preencher uma linha na §4.
6. `git revert` ou checkout do commit anterior antes do próximo Exp.

**Variáveis a manter iguais:** duração (3 min), dispositivos, mesma sala “tipo consulta”, câmera ligada o tempo todo.

---

## Tabela de resultados

Preencha após cada experimento. Δ = comparado ao **Exp 0** (baseline).

| Exp | Data | Room LiveKit | Duração | Upstream | Downstream | Δ Up vs baseline | Δ Down vs baseline | Qualidade (1–5) | Observações |
|-----|------|--------------|---------|----------|------------|------------------|---------------------|-----------------|-------------|
| 0 baseline | 2026-05-27 | `RM_fd6nQgmSn6UF` | 64 min | 2,18 GB (34,1 MB/min) | 1,55 GB (24,2 MB/min) | — | — | — | Cloud; código default; 1:1 |
| 1 publish-h360 | | `RM_sZcrpj3cuFEB` | | | | | | | Só paciente; métricas Cloud pendentes |
| 2 publish-h360-both | | `RM_ZJWhAreMYCDi` | | | | | | | Paciente + web; métricas Cloud pendentes |
| 3 dynacast | | `RM_wLVgDapJvXcj` | | | | | | | h360 + dynacast; métricas Cloud pendentes |
| 4 adaptive-stream | | | | | | | | |
| 5 videotrack | | | | | | | | |
| 6 adaptive-ui | | | | | | | | |
| 7 quality-low-remote | | | | | | | | |
| 8 audio-red-off | | | | | | | | |
| 9 profile-orchestrator | | | | | | | | |

**Como calcular Δ:** `Δ Up = (MB/min_exp − 34,1) / 34,1 × 100%` (idem para Down com 24,2).

**Colunas opcionais:** commit/branch · Web `webrtc-internals` · CPU/bateria · falhas de conexão

---

## Snippets de referência (não aplicar tudo de uma vez)

### Exp 1 — só publicação h360 (paciente)

Ver `mobile-paciente/src/utils/livekit-room.ts` → `createConsultaRoom()`.

### Exp 2 — publicação h360 (paciente + web)

Mesmo preset em `web-profissional/src/app/livekit-room.ts` → `createConsultaRoom()` (mantém `disconnectOnPageLeave: false`).

### Exp 3 — dynacast (acumula h360 dos Exps 1–2)

```typescript
new Room({
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
  publishDefaults: { videoEncoding: VideoPresets.h360.encoding },
});
```

### Exp 4 — adaptive stream

```typescript
new Room({ adaptiveStream: true, dynacast: true }); // dynacast só se Exp 3 já validado
```

### Exp 7 — qualidade máxima baixa no remoto

```typescript
import { Track, VideoQuality } from 'livekit-client';

// No TrackSubscribed, se vídeo remoto:
if (track.kind === Track.Kind.Video) {
  publication.setVideoQuality(VideoQuality.LOW);
}
```

---

## Decisão após a série

| Se… | Então… |
|-----|--------|
| Exp 1 mostra ↓ claro sem qualidade ruim | Adotar h360 (ou h540) como default do paciente no MVP |
| Exp 3–4 ~0% em tela cheia | Manter ligados “de graça” (custo CPU baixo) ou só ativar com PiP (Exp 6) |
| Exp 6 + 4/5 mostram ganho | Layout com preview pequeno no app paciente |
| Exp 8 ↓ pouco e áudio piora | Manter RED ligado |

Consolidar escolhas no [SPIKE-RESUMO-EXECUTIVO.md](../SPIKE-RESUMO-EXECUTIVO.md) ou ADR quando fechar a série.

---

## Links

- [Subscribing — adaptive stream](https://docs.livekit.io/transport/media/subscribe/)
- [Codecs & more — presets, simulcast, dynacast](https://docs.livekit.io/transport/media/advanced/)
