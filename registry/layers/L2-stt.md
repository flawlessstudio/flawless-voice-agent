# L2 — Speech-to-Text (STT)

## Core: Deepgram

**Why**: Best-in-class latency for real-time streaming, strong WER on phone calls (nova-2-phonecall model), native WebSocket streaming and direct integration with Twilio media streams.

**Docs**: https://developers.deepgram.com

## Watchlist

| Candidate | Score | Notes |
|---|---|---|
| AssemblyAI | 8 | High accuracy. Slightly higher latency for real-time. |
| Whisper (OpenAI) | 7 | Best accuracy but not optimized for streaming. |
| Speechmatics | 7 | Strong enterprise compliance features. |

## Criteria for promotion
- Must achieve < 200ms time-to-first-token on phone audio.
- Must achieve < 5% WER on outbound sales calls.
