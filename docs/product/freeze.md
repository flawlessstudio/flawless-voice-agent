# Frozen Decisions

These decisions are locked for v0.1.0. Changes require a new ADR (Architecture Decision Record).

| # | Decision | Rationale |
|---|---|---|
| 1 | Node.js 20 + TypeScript ESM | LTS, native fetch, ESM-first |
| 2 | Fastify over Express | 3x faster, native TypeScript, WebSocket plugin |
| 3 | OpenAI Realtime as primary LLM path | Lowest latency, VAD server-side, native audio |
| 4 | g711_ulaw for Twilio audio | Direct Twilio format, no transcoding |
| 5 | Non-blocking CRM sync | Audio must never wait for CRM writes |
| 6 | Dual CRM (HubSpot + Salesforce) | Activated by env vars, independent failures |
| 7 | HMAC validation on all webhooks | Security baseline, non-negotiable |
| 8 | Multi-stage Docker, non-root user | Security baseline |
| 9 | Jest + ts-jest for tests | Native TypeScript, no transpile step |
| 10 | ghcr.io for container registry | Free, integrated with GitHub Actions |
