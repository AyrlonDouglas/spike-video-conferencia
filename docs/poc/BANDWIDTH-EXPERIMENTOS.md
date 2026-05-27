# PoC — Experimentos de bandwidth (LiveKit)

| Campo | Valor |
|-------|-------|
| **Objetivo** | Medir o ganho de cada ajuste de forma **atômica** (uma mudança por vez) |
| **Cenário** | Videoconsulta 1:1 — `mobile-paciente` + `web-profissional` |
| **Baseline** | `new Room()` sem opções · `VideoView` · defaults de publicação |
| **Status** | Fase 1 (Exps 0–8) em curso · **Fase 2** (h540) planejada abaixo |
| **Preset adotado** | **h360** (~450 kbps) nos dois lados + stack Exps 3–8 |

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

### Resultado registrado — Exp 1 (2026-05-27)

**Room LiveKit:** `RM_sZcrpj3cuFEB` · **mudança:** h360 só no paciente (web com defaults).

| Métrica | Valor | Normalizado (por minuto) | Δ vs Exp 0 (MB/min) |
|---------|-------|---------------------------|---------------------|
| Duração | **6 min** | — | — |
| Upstream | **107,48 MB** | ~17,9 MB/min | **−48%** (34,1 → 17,9) |
| Downstream | **65,09 MB** | ~10,9 MB/min | **−55%** (24,2 → 10,9) |
| **Total** | **172,57 MB** | ~28,8 MB/min | **−51%** (58,3 → 28,8) |

**Leitura:** queda forte no tráfego da room mesmo com web ainda em resolução alta — coerente com ↓ uplink do paciente e ↓ downlink no médico (vídeo remoto do paciente). Duração diferente do baseline (6 vs 64 min); comparação via **MB/min**.

### Resultado registrado — Exp 2 (2026-05-27)

**Room LiveKit:** `RM_ZJWhAreMYCDi` · **mudança:** h360 no paciente **e** no web.

| Métrica | Valor | Normalizado (por minuto) | Δ vs Exp 0 (MB/min) |
|---------|-------|---------------------------|---------------------|
| Duração | **6 min** | — | — |
| Upstream | **49,2 MB** | ~8,2 MB/min | **−76%** (34,1 → 8,2) |
| Downstream | **32,57 MB** | ~5,4 MB/min | **−78%** (24,2 → 5,4) |
| **Total** | **81,77 MB** | ~13,6 MB/min | **−77%** (58,3 → 13,6) |

**Leitura:** vs Exp 1 (17,9 / 10,9 MB/min), caiu mais **−54% up** e **−50% down** — coerente com o médico também publicando em h360. Melhor custo/benefício até aqui para 1:1.

### Resultado registrado — Exp 3 (2026-05-27)

**Room LiveKit:** `RM_wLVgDapJvXcj` · **mudança:** `dynacast: true` (acumula h360 nos dois lados).

| Métrica | Valor | Normalizado (por minuto) | Δ vs Exp 0 (MB/min) |
|---------|-------|---------------------------|---------------------|
| Duração | **6 min** | — | — |
| Upstream | **52,6 MB** | ~8,8 MB/min | **−74%** (34,1 → 8,8) |
| Downstream | **38,99 MB** | ~6,5 MB/min | **−73%** (24,2 → 6,5) |
| **Total** | **91,59 MB** | ~15,3 MB/min | **−74%** (58,3 → 15,3) |

**Leitura:** praticamente igual ao Exp 2 (8,2 / 5,4 MB/min) — em 1:1 tela cheia o dynacast **não reduziu** tráfego mensurável (esperado: ambos consomem camada alta). Δ vs Exp 2: **+7% up**, **+20% down** (variação de sessão/medição, não ganho claro).

### Resultado registrado — Exp 4 (2026-05-27)

**Room LiveKit:** `RM_k7a7wThdTnmV` · **mudança:** `adaptiveStream: true` (acumula h360 + dynacast).

| Métrica | Valor | Normalizado (por minuto) | Δ vs Exp 0 (MB/min) |
|---------|-------|---------------------------|---------------------|
| Duração | **7 min** | — | — |
| Upstream | **41,48 MB** | ~5,9 MB/min | **−83%** (34,1 → 5,9) |
| Downstream | **26,76 MB** | ~3,8 MB/min | **−84%** (24,2 → 3,8) |
| **Total** | **68,24 MB** | ~9,7 MB/min | **−83%** (58,3 → 9,7) |

**Leitura:** **menor tráfego até aqui** na série de 6–7 min. vs Exp 2: **−28% up**, **−30% down** (MB/min) — adaptive stream pode ter ajudado (web com `attach`; RN ainda com `VideoView`). vs Exp 3: **−33% up**, **−42% down**. Duração 7 min vs 6 min nos outros — comparar sempre por MB/min.

### Resultado registrado — Exp 5 (2026-05-27)

**Room LiveKit:** `RM_hV3F964heLmn` · **mudança:** `VideoView` → `VideoTrack` + `trackRef` no paciente (acumula h360 + dynacast + adaptiveStream).

| Métrica | Valor | Normalizado (por minuto) | Δ vs Exp 0 (MB/min) |
|---------|-------|---------------------------|---------------------|
| Duração | **6 min** | — | — |
| Upstream | **47,92 MB** | ~8,0 MB/min | **−77%** (34,1 → 8,0) |
| Downstream | **30,74 MB** | ~5,1 MB/min | **−79%** (24,2 → 5,1) |
| **Total** | **78,66 MB** | ~13,1 MB/min | **−78%** (58,3 → 13,1) |

**Leitura:** vs Exp 4 (5,9 / 3,8 MB/min): **+36% up**, **+34% down** (MB/min) — na mesma ordem de grandeza que Exp 2–3; **sem ganho adicional** mensurável ao trocar `VideoView` por `VideoTrack` com remoto ainda em tela cheia. Coerente com adaptive stream no RN precisar de preview pequeno (Exp 6) para efeito claro.

### Resultado registrado — Exp 6 (2026-05-27)

**Room LiveKit:** `RM_q3wYiMAJstVF` · **mudança:** layout PiP (remoto fullscreen + local pequeno) paciente + web; web com `object-fit: contain` no vídeo remoto (quadro vertical inteiro).

| Métrica | Valor | Normalizado (por minuto) | Δ vs Exp 0 (MB/min) |
|---------|-------|---------------------------|---------------------|
| Duração | **8 min** | — | — |
| Upstream | **66,2 MB** | ~8,3 MB/min | **−76%** (34,1 → 8,3) |
| Downstream | **45,34 MB** | ~5,7 MB/min | **−77%** (24,2 → 5,7) |
| **Total** | **111,54 MB** | ~13,9 MB/min | **−76%** (58,3 → 13,9) |

**Leitura:** vs Exp 5 (8,0 / 5,1 MB/min): **+4% up**, **+12% down** — PiP + `contain` **sem ganho mensurável** na room (variação de sessão). vs Exp 4 (5,9 / 3,8): **+41% up**, **+50% down** — pior que o menor da série; remoto segue fullscreen nos dois lados, então adaptive stream no preview local pequeno não apareceu no agregado Cloud. Duração 8 min vs 6–7 min nos outros — comparar por MB/min.

### Resultado registrado — Exp 7 (em andamento)

**Room LiveKit:** `RM_abQHGntFmSX5` · **mudança:** `setVideoQuality(VideoQuality.LOW)` no vídeo remoto da câmera — **só** `mobile-paciente` (`[sessionId].tsx`).

| Métrica | Valor | Normalizado (por minuto) | Δ vs Exp 0 |
|---------|-------|---------------------------|------------|
| Duração | *pendente* | — | — |
| Upstream | *pendente* | — | — |
| Downstream | *pendente* | — | — |

*(Acumula Exps 1–6 no código atual.)*

### Resultado registrado — Exp 8 (em andamento)

**Room LiveKit:** `RM_FwLENn43zHZL` · **mudança:** `red: false` em `publishDefaults` + `setMicrophoneEnabled` — **só** `mobile-paciente`.

| Métrica | Valor | Normalizado (por minuto) | Δ vs Exp 0 |
|---------|-------|---------------------------|------------|
| Duração | *pendente* | — | — |
| Upstream | *pendente* | — | — |
| Downstream | *pendente* | — | — |

*(Acumula Exps 1–7 no código atual.)*

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

## Fase 2 — Qualidade de imagem (preset intermediário)

Objetivo: comparar **h360 (adotado)** vs **h540 (intermediário)** com o **mesmo stack** de otimizações (dynacast, adaptiveStream, VideoTrack, PiP, etc.). Não é série atômica de novo — só troca o preset de vídeo.

### Presets LiveKit (referência)

| Preset | Resolução típica | Bitrate alvo (~) | Papel na PoC |
|--------|------------------|------------------|--------------|
| h180 | 320×180 | ~150 kbps | Muito baixo — fora do escopo |
| **h360** | 640×360 | **~450 kbps** | **Adotado** (Exps 1–8) |
| **h540** | 960×540 | **~900 kbps** | **Intermediário** (Fase 2) |
| h720 | 1280×720 | ~1,7 Mbps | Alto — baseline Exp 0 |

### Referência para comparação (Fase 2)

Use como **linha de base de custo** a configuração já validada com h360 + stack completo, não o Exp 0 cru:

| Referência | Room (exemplo) | Up (MB/min) | Down (MB/min) |
|------------|----------------|-------------|---------------|
| h360 + stack | Exp 2 `RM_ZJWhAreMYCDi` | ~8,2 | ~5,4 |
| h360 + stack (sessões recentes) | Exp 5–6 | ~8,0–8,3 | ~5,1–5,7 |

Calcule também **Δ vs Exp 0** na tabela para manter histórico.

### Exps da Fase 2

| # | ID | Mudança | App | Como aplicar | O que medir |
|---|-----|---------|-----|--------------|-------------|
| 10 | `publish-h540-both` | `CONSULTA_VIDEO_PRESET = VideoPresets.h540` | Paciente + web | `livekit-room.ts` nos dois apps | MB/min vs h360+stack; **qualidade subjetiva** |
| 11 | `publish-h540-patient` *(opcional)* | h540 só no paciente; web mantém h360 | Só mobile | preset h540 no mobile, h360 no web | Isolar custo do uplink do paciente |

**Regra:** um Exp = um preset (10 ou 11). Manter **6–8 min**, mesma rede e roteiro. Preencher coluna **Qualidade (1–5)**:

- Vídeo que o **médico** vê (paciente)
- Vídeo que o **paciente** vê (médico)
- Áudio (ambos)
- Travamentos sim/não

### Roteiro Fase 2

1. Fechar métricas pendentes da Fase 1 (Exps 7–8) com h360.
2. Em `mobile-paciente` e `web-profissional`, trocar `CONSULTA_VIDEO_PRESET` para `VideoPresets.h540` (Exp 10) ou só no mobile (Exp 11).
3. Rebuild/reload dos dois apps; **nova** room LiveKit.
4. Consulta 6–8 min; anotar Cloud + qualidade subjetiva.
5. Reverter preset para `h360` antes do próximo Exp ou commit.

### Snippet — Exp 10 (h540 nos dois lados)

```typescript
// mobile-paciente/src/utils/livekit-room.ts e web-profissional/.../livekit-room.ts
import { VideoPresets } from 'livekit-client';

export const CONSULTA_VIDEO_PRESET = VideoPresets.h540;
```

### Snippet — Exp 11 (h540 só paciente)

```typescript
// mobile: CONSULTA_VIDEO_PRESET = VideoPresets.h540;
// web:   CONSULTA_VIDEO_PRESET = VideoPresets.h360;  // inalterado
```

**Leitura esperada:** h540 ≈ **2× bitrate** alvo vs h360 → room total pode subir ~30–80% (MB/min), dependendo de simulcast/SFU. Se qualidade subjetiva não melhorar de forma clara, manter **h360** no MVP.

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
| 1 publish-h360 | 2026-05-27 | `RM_sZcrpj3cuFEB` | 6 min | 107,48 MB (17,9 MB/min) | 65,09 MB (10,9 MB/min) | **−48%** | **−55%** | — | Só paciente h360; baseline 64 min |
| 2 publish-h360-both | 2026-05-27 | `RM_ZJWhAreMYCDi` | 6 min | 49,2 MB (8,2 MB/min) | 32,57 MB (5,4 MB/min) | **−76%** | **−78%** | — | h360 paciente + web |
| 3 dynacast | 2026-05-27 | `RM_wLVgDapJvXcj` | 6 min | 52,6 MB (8,8 MB/min) | 38,99 MB (6,5 MB/min) | **−74%** | **−73%** | — | h360 + dynacast; ~Exp 2 |
| 4 adaptive-stream | 2026-05-27 | `RM_k7a7wThdTnmV` | 7 min | 41,48 MB (5,9 MB/min) | 26,76 MB (3,8 MB/min) | **−83%** | **−84%** | — | + adaptiveStream (VideoView no RN) |
| 5 videotrack | 2026-05-27 | `RM_hV3F964heLmn` | 6 min | 47,92 MB (8,0 MB/min) | 30,74 MB (5,1 MB/min) | **−77%** | **−79%** | — | VideoTrack no RN; ~Exp 2–4 |
| 6 adaptive-ui | 2026-05-27 | `RM_q3wYiMAJstVF` | 8 min | 66,2 MB (8,3 MB/min) | 45,34 MB (5,7 MB/min) | **−76%** | **−77%** | — | PiP + contain; ~Exp 5 |
| 7 quality-low-remote | 2026-05-27 | `RM_abQHGntFmSX5` | | | | | | | LOW no remoto; só mobile; métricas pendentes |
| 8 audio-red-off | 2026-05-27 | `RM_FwLENn43zHZL` | | | | | | | `red: false` no áudio; só mobile; métricas pendentes |
| 9 profile-orchestrator | | | | | | | | |
| 10 publish-h540-both | | | | | | | | | h540 paciente + web; stack Exps 3–8; Fase 2 |
| 11 publish-h540-patient | | | | | | | | | h540 só paciente *(opcional)*; Fase 2 |

**Como calcular Δ (Fase 2):** além do Exp 0, anotar Δ vs **h360+stack** (~8,2 / ~5,4 MB/min da Exp 2 ou média Exps 5–6).

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

### Exp 4 — adaptive stream (acumula Exps 1–3)

```typescript
new Room({
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
  publishDefaults: { videoEncoding: VideoPresets.h360.encoding },
});
```

Web: `track.attach()` em `<video>` já usado em `consulta.component.ts` — adaptive stream deve atuar. RN: efeito limitado até Exp 5 (`VideoTrack`).

### Exp 5 — VideoTrack (só paciente, acumula Exps 1–4)

Trocar `VideoView` por `VideoTrack` com `trackRef` (`@livekit/components-react`) em `app/consulta/[sessionId].tsx` — habilita adaptive stream no RN.

### Exp 6 — layout PiP (paciente + web, acumula Exps 1–5)

- **Paciente:** remoto em tela cheia; preview local 112×150 no canto (`videoStage` / `localPip`).
- **Web:** `.video-stage` com remoto grande e `.local-pip` ~200×150; antes do remoto, local em tela cheia.

### Exp 7 — qualidade máxima baixa no remoto

```typescript
import { Track, VideoQuality } from 'livekit-client';

// No TrackSubscribed, se vídeo remoto:
if (track.kind === Track.Kind.Video) {
  publication.setVideoQuality(VideoQuality.LOW);
}
```

### Exp 8 — Audio RED desligado (só paciente, acumula Exps 1–7)

```typescript
// mobile-paciente/src/utils/livekit-room.ts
publishDefaults: { videoEncoding: VideoPresets.h360.encoding, red: false },
export const AUDIO_PUBLISH_OPTIONS = { red: false };

await room.localParticipant.setMicrophoneEnabled(true, undefined, AUDIO_PUBLISH_OPTIONS);
```

---

## Decisão após a série

| Se… | Então… |
|-----|--------|
| Exp 1–2 + Fase 2: h540 não compensa em qualidade | Manter **h360** no MVP |
| Fase 2: h540 melhora vídeo sem travar e Δ MB/min aceitável | Avaliar **h540** só no paciente (Exp 11) ou nos dois (Exp 10) |
| Exp 1 mostra ↓ claro sem qualidade ruim | h360 confirmado como default mínimo |
| Exp 3–4 ~0% em tela cheia | Manter ligados “de graça” (custo CPU baixo) ou só ativar com PiP (Exp 6) |
| Exp 6 + 4/5 mostram ganho | Layout com preview pequeno no app paciente |
| Exp 8 ↓ pouco e áudio piora | Manter RED ligado |

Consolidar escolhas no [SPIKE-RESUMO-EXECUTIVO.md](../SPIKE-RESUMO-EXECUTIVO.md) ou ADR quando fechar a série.

---

## Links

- [Subscribing — adaptive stream](https://docs.livekit.io/transport/media/subscribe/)
- [Codecs & more — presets, simulcast, dynacast](https://docs.livekit.io/transport/media/advanced/)
