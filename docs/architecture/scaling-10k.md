# Scaling to 10k Concurrent Calls

## Strategy

Separate each layer into independent deployable units. Scale each layer independently based on its own saturation metric.

## Layer scaling plan

| Layer | Scaling unit | Metric | Target |
|---|---|---|---|
| Telephony (Twilio) | Subcuentas + pools | Concurrent calls | 10k |
| STT (Deepgram) | Streaming connections | Active sessions | 10k |
| LLM (OpenAI) | Inference workers | Queue depth | < 100ms wait |
| TTS (ElevenLabs) | TTS workers | Request queue | < 200ms wait |
| Orchestration (Vapi/Retell) | Stateless pods | RPS | Auto |
| CRM (HubSpot/Salesforce) | Async queue | Queue length | < 1k items |
| Analytics | Async queue | Queue length | Unbounded |

## Resilience

- Backpressure on all input channels.
- Circuit breakers per layer.
- Retry with exponential backoff.
- Session state in external store (Redis).
- CRM/analytics writes async via event queue.
- Human takeover fallback always available.

## Load testing targets

- 100 concurrent: baseline
- 1k concurrent: pre-production
- 10k concurrent: production readiness
