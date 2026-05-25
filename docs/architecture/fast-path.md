# Fast Path

## Purpose
High-volume outbound qualification. Optimized for latency and throughput.

## Route
Twilio → Deepgram STT → OpenAI Realtime → ElevenLabs → Vapi → HubSpot

## Latency budget
- Target: < 800ms end-to-end response
- p95: < 1200ms

## Use cases
- Outbound qualification
- Appointment setting
- Lead enrichment calls
- High-volume outreach

## Circuit breaker
If p95 latency > 1500ms for 60s, switch to fallback path.
