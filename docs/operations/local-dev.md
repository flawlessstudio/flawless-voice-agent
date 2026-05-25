# Local Development

## Prerequisites

- Node.js >= 20
- Docker + Docker Compose
- A `.env` file based on `.env.example`

## Quick start

```bash
# 1. Clone
git clone https://github.com/flawlessstudio/flawless-voice-agent.git
cd flawless-voice-agent

# 2. Install dependencies
npm install

# 3. Copy env
cp .env.example .env
# Fill in your API keys in .env

# 4. Start Redis + app
npm run docker:up

# OR run just Redis via Docker and app locally:
docker-compose up redis -d
npm run dev
```

## Run tests

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Run eval

```bash
npm run eval:smoke
npm run eval:regression
```

## Run load test

```bash
# Make sure app is running first
CONCURRENCY=100 TARGET_URL=http://localhost:3000 npm run test:load
```

## Expose locally via ngrok (for Twilio webhooks)

```bash
ngrok http 3000
# Copy the HTTPS URL and set it in Twilio console as webhook
```
