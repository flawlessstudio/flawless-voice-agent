# Architecture Overview

## System Summary

Flawless Voice Agent is a hybrid voice AI platform built on a 6-layer architecture. It bridges telephony (Twilio) with AI processing (Deepgram, OpenAI, ElevenLabs) and CRM synchronisation (HubSpot, Salesforce) via orchestration platforms (Vapi, Retell).

## Layer Map

```
L1  Twilio          — telephony, MediaStream WebSocket, call lifecycle
L2  Deepgram        — STT (nova-3) or full Voice Agent (STT+LLM+TTS)
L3  OpenAI Realtime — LLM reasoning, tool calling, VAD server-side
L4  ElevenLabs      — TTS streaming or Conversational AI agent
L5  Vapi / Retell   — orchestration, outbound dialling, webhook routing
L6  HubSpot / SF    — CRM engagement, transcript, contact association
```

## Call Paths

| Path     | Latency  | Stack                                  |
|----------|----------|----------------------------------------|
| fast     | ~860ms   | Twilio → OpenAI Realtime → CRM         |
| deep     | ~1.700ms | Twilio → Deepgram → OpenAI → ElevenLabs → CRM |
| fallback | varies   | Vapi / Retell managed                  |

## Data Flow

```
Incoming call
  → POST /incoming-call → TwiML <Connect><Stream>
  → WS /media-stream
      ↔ OpenAI Realtime (audio g711_ulaw bidirectional)
          → transcript accumulated in SessionStore
          → tool call: log_to_crm
              → syncCallToHubSpot()   [non-blocking]
              → syncCallToSalesforce() [non-blocking]
  → POST /status (call ended)
```

## Key Design Decisions

- **Non-blocking CRM sync**: CRM writes never block the audio path.
- **Fire-and-forget tool calls**: OpenAI gets `function_call_output` immediately.
- **Dual CRM**: Both HubSpot and Salesforce activate independently based on env vars.
- **OAuth2 auto-refresh**: Salesforce token refresh is transparent and automatic.
- **Signature validation**: Twilio (HMAC-SHA1) and Retell (HMAC-SHA256) verified on every webhook.
