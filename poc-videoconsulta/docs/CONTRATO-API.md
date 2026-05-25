# Contrato API — PoC videoconsulta (orquestrador)

> Fonte da verdade para integração entre `orchestrator`, `web-profissional` e `mobile-paciente`.  
> Cada app implementa seus próprios tipos TypeScript com base neste documento — **sem pacote npm compartilhado**.

**Base URL (dev):** `http://localhost:3000`

## Tipos

### SessionState

```
criada | aguardando | mídia_pendente | ativa | encerrada | vetada
```

### ParticipantRole

```
medico | paciente
```

## Endpoints

### `GET /health`

Resposta: `{ "ok": true }`

### `POST /sessions`

Cria sessão em memória. O room no LiveKit é provisionado no primeiro `POST /sessions/:id/join`.

**Resposta 201:**

```json
{
  "id": "uuid",
  "state": "criada",
  "livekitUrl": "wss://....livekit.cloud"
}
```

### `GET /sessions/:id`

Snapshot da sessão (usado em polling ~2s pelos clients).

**Resposta 200:**

```json
{
  "id": "uuid",
  "state": "mídia_pendente",
  "providerRoomId": "uuid",
  "livekitUrl": "wss://...",
  "participants": [
    {
      "participantId": "medico-abc",
      "role": "medico",
      "connected": true,
      "audio": true,
      "video": true
    }
  ],
  "mediaReady": false,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

`mediaReady === true` somente quando dois participantes têm `audio` e `video` (anti-desencontro).

### `POST /sessions/:id/join`

**Body:**

```json
{
  "role": "medico",
  "participantId": "opcional-custom-id"
}
```

**Resposta 200:**

```json
{
  "sessionId": "uuid",
  "role": "medico",
  "participantId": "medico-abc",
  "token": "jwt-livekit",
  "wsUrl": "wss://....livekit.cloud",
  "state": "aguardando"
}
```

**Erros:** `403` se sessão `encerrada` ou `vetada`; `403` se o `role` já entrou.

### `POST /sessions/:id/end`

Encerra sessão e destrói room no LiveKit.

**Resposta 200:** snapshot com `state: "encerrada"`.

### `POST /sessions/:id/veto`

Mock C4 — encerra e veta reentrada do paciente.

**Resposta 200:** snapshot com `state: "vetada"`.

### `POST /webhooks/livekit`

Recebe webhooks do LiveKit Cloud. Header `Authorization` validado pelo SDK.

**Resposta 200:** `{ "ok": true }`

Eventos relevantes: `participant_joined`, `participant_left`, `track_published`, `track_unpublished`, `room_finished`.

## Variáveis de ambiente por app

| App | Variável | Exemplo |
|-----|----------|---------|
| orchestrator | `LIVEKIT_URL` | `wss://proj.livekit.cloud` |
| orchestrator | `LIVEKIT_API_KEY` | — |
| orchestrator | `LIVEKIT_API_SECRET` | — |
| orchestrator | `PORT` | `3000` |
| web-profissional | URL no `environment.ts` | `http://localhost:3000` |
| mobile-paciente | `EXPO_PUBLIC_ORCHESTRATOR_URL` | `http://192.168.x.x:3000` |

## UI — regra P3

Clients **não** devem exibir “Consulta ativa” enquanto `state !== "ativa"`, mesmo que o LiveKit SDK reporte conexão estabelecida.
