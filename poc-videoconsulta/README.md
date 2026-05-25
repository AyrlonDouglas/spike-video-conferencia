# PoC LiveKit — videoconsulta

Três apps **independentes** (sem monorepo). Contrato REST em [`docs/CONTRATO-API.md`](docs/CONTRATO-API.md).

## Pré-requisitos

- Conta [LiveKit Cloud](https://cloud.livekit.io/)
- Node.js 20+
- ngrok (webhooks em dev)

## 1. Orquestrador (NestJS)

```sh
cd apps/orchestrator
cp .env.example .env   # preencher LIVEKIT_*
npm install
npm run build
npm run start:dev
```

Webhook dev: `ngrok http 3000` → configurar no dashboard LiveKit: `POST https://<ngrok>/webhooks/livekit`

## 2. Web profissional (Angular)

```sh
cd apps/web-profissional
npm install
npm run build
npm start
```

Abrir `http://localhost:4200` — criar sessão ou colar ID.

## 3. Mobile paciente (Expo)

```sh
cd apps/mobile-paciente
npm install --legacy-peer-deps
# device físico: use IP da máquina
export EXPO_PUBLIC_ORCHESTRATOR_URL=http://192.168.x.x:3000
npx expo prebuild
npx expo run:ios   # ou run:android
```

**Não usar Expo Go** — WebRTC exige development build.

## Teste rápido (P1–P3 sem mobile)

1. Orquestrador rodando com credenciais LiveKit
2. Angular: criar sessão → copiar ID
3. Segundo browser (ou aba anônima): colar ID e entrar como médico **ou** simular paciente via curl:

```sh
curl -X POST http://localhost:3000/sessions/<ID>/join \
  -H 'Content-Type: application/json' \
  -d '{"role":"paciente"}'
```

## Estrutura

```
apps/orchestrator/src/provider/   # adapter LiveKit
apps/web-profissional/           # médico (livekit-client)
apps/mobile-paciente/            # paciente (Expo + @livekit/react-native)
docs/CONTRATO-API.md
docs/RESULTADOS-POC.md           # preencher após provas P1–P6
```
