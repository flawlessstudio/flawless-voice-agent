# Local Development

## Prerequisites

- Node.js 20+ (use `.nvmrc`: `nvm use`)
- ngrok account (free tier works)
- Twilio account with a phone number
- OpenAI API key with Realtime access

## Setup

```bash
# 1. Clone
git clone https://github.com/flawlessstudio/flawless-voice-agent.git
cd flawless-voice-agent

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your real keys

# 4. Start tunnel
ngrok http 5050
# Copy the https:// URL → paste as PUBLIC_URL in .env

# 5. Configure Twilio Console
# Phone Numbers > Active Numbers > your number
# “A call comes in”: POST https://xxxx.ngrok-free.app/incoming-call
# Status Callback:   POST https://xxxx.ngrok-free.app/status

# 6. Start dev server
npm run dev
```

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Hot-reload dev server (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check (no emit) |
| `npm test` | Jest unit tests |
| `npm test -- --coverage` | Tests with coverage report |

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/incoming-call` | Twilio webhook → TwiML |
| WS | `/media-stream` | Twilio ↔ OpenAI audio bridge |
| POST | `/status` | Twilio status callback |
| POST | `/webhooks/vapi` | Vapi event webhook |
| POST | `/webhooks/retell` | Retell event webhook |
| GET | `/health` | Health check |
