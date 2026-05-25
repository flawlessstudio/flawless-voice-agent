# L3 — LLM / Reasoning

## Core: OpenAI Realtime / Agents

**Why**: Only provider with a native Realtime API that eliminates the STT/TTS round-trip latency. Strong function calling, memory support and controlled handoff. Agents API supports multi-step tool use.

**Docs**: https://platform.openai.com/docs/guides/realtime

## Watchlist

| Candidate | Score | Notes |
|---|---|---|
| Anthropic Claude | 8 | Best reasoning and safety. No Realtime API yet. Monitor. |
| Gemini Live | 8 | Native multimodal real-time. Competitive. Monitor stability. |
| Llama 3 (self-hosted) | 6 | Cost advantage. Latency depends on infra. |

## Criteria for promotion
- Must have a native real-time streaming API.
- Must support function calling / tool use.
- Must support multi-turn memory.
