# Architecture Overview

## Dual-path hybrid architecture

The flawless-voice-agent uses a **dual-path hybrid architecture** with three routes:

1. **Fast path**: optimized for latency and throughput
2. **Deep path**: optimized for reasoning and conversion
3. **Fallback path**: controlled degradation to human or callback

## Layer map

```
Twilio (L1)
  │
  ├── Deepgram STT (L2)
  │     │
  │     ├── [Fast] OpenAI Realtime (L3) → ElevenLabs (L4) → Vapi (L5) → HubSpot (L6)
  │     │
  │     ├── [Deep] OpenAI Agents + tools (L3) → ElevenLabs (L4) → Retell (L5) → Salesforce (L6)
  │     │
  │     └── [Fallback] Minimal LLM (L3) → ElevenLabs (L4) → Vapi fallback (L5) → HubSpot (L6)
  │
  └── Custom eval + QA layer (L7)
```

## Routing logic

- Default route is **fast path**.
- Switch to **deep path** when: complexity score > threshold, objection detected, deal value high.
- Switch to **fallback path** when: latency budget exceeded, circuit breaker open, error rate > threshold.

## Scalability

- Each layer is a separate deployable unit.
- Telephony is the front door only — no business logic.
- Audio streaming via WebRTC or low-latency transport.
- LLM/TTS in horizontal worker pools.
- Session state in external store.
- CRM/analytics async via event queues.

## See also

- [Fast path](./fast-path.md)
- [Deep path](./deep-path.md)
- [Fallback path](./fallback-path.md)
- [Scaling 10k](./scaling-10k.md)
- [Compliance](./compliance.md)
