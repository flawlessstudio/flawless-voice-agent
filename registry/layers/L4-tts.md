# L4 — Text-to-Speech (TTS)

## Core: ElevenLabs

**Why**: Best perceived naturalness and human-like voice for commercial outbound calls. Turbo v2.5 model achieves very low latency. Strong voice cloning support.

**Docs**: https://docs.elevenlabs.io

## Watchlist

| Candidate | Score | Notes |
|---|---|---|
| Cartesia | 8 | Ultra-low latency. Strong for fast path. Less natural than ElevenLabs. |
| OpenAI TTS | 7 | Good quality, easy integration. Less natural for commercial voice. |
| PlayHT | 7 | Good naturalness. Monitor for latency improvements. |

## Criteria for promotion
- Must achieve < 300ms first audio chunk on < 200 char input.
- Must achieve MOS > 4.0 on human perception evaluation.
