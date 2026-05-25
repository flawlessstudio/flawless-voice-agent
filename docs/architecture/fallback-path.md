# Fallback Path

## Purpose
Controlled degradation when fast/deep paths fail or exceed budget.

## Route
Twilio → Deepgram STT → Simplified prompt (no tools) → ElevenLabs → Vapi fallback flow → HubSpot

## Triggers
- Fast path circuit breaker open
- Deep path timeout
- Error rate > 5% over 60s window
- External service degradation

## Behavior
- Minimal LLM: only basic conversation, no tools, no memory
- Route to human agent or schedule callback
- Log session for replay and review
