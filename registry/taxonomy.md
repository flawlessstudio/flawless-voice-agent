# Registry Taxonomy

## Layers

| ID | Name | Description |
|---|---|---|
| L1 | Telephony | Inbound/outbound call routing, PSTN, SIP, compliance |
| L2 | STT | Speech-to-text, transcription, real-time streaming |
| L3 | LLM | Language model, reasoning, tools, memory, handoff |
| L4 | TTS | Text-to-speech, voice synthesis, naturalness |
| L5 | Orchestration | Call flow, routing, state machine, session control |
| L6 | Integration | CRM, calendar, ticketing, data sync |
| L7 | Analytics / QA | Metrics, traces, eval, human review, scoring |
| L12 | Domain Vertical | Specialized agents for sales, recruiting, support |

## Status values

- `core`: Active winner for this layer. Frozen unless evidence forces a change.
- `watchlist`: Strong candidate. Monitored. Can replace core if it outperforms.
- `deprecated`: Previously active, now retired.
- `experimental`: Under evaluation, not production-ready.

## Selection criteria

A candidate enters `core` only if it provides a measurable improvement in at least one of:
- Latency
- Voice naturalness
- Reasoning quality
- Handoff reliability
- Integration coverage
- Observability
- Maintainability

A candidate enters `watchlist` if it is competitive but has not yet proven superiority.
