# Post-Call Flow

## Overview

The post-call chain runs **after** `call.ended` / Twilio `stop` event. It is completely decoupled from the real-time audio path and runs asynchronously to avoid any latency impact on active calls.

## Sequence diagram

```
Twilio ──stop──► mediaStream.ts
                     │
                 endCall()
                     │
              session.end()
                     │
         flushSessionToCRM(session)
                     │
              ┌──────▼──────┐
              │   analyzer   │  gpt-4o-mini, temp=0, json_object
              │  (OpenAI CC) │  → intent, summary, sentiment, outcome
              └──────┬──────┘
                     │
              ┌──────▼──────────────────────────────┐
              │         crm-enricher                 │
              │  Promise.allSettled([                │
              │    syncToHubspot(enriched),          │
              │    syncToSalesforce(enriched)        │
              │  ])                                  │
              └──────────────────────────────────────┘
```

## HubSpot sync steps

1. `POST /crm/v3/objects/calls` — create call engagement
2. `PUT /crm/v3/objects/calls/{id}/associations/contact/{cid}/call_to_contact` — associate contact
3. `POST /crm/extensions/calling/2026-03/transcripts` — upload utterances
4. `POST /crm/v3/extensions/calling/recordings/ready` — notify recording ready (if audio URL present)

## Salesforce sync steps

1. `PATCH /telephony/v1/voiceCalls/{callId}` — update VoiceCall record
2. Note: Salesforce Service Cloud Voice supports **real-time transcription only** (Amazon Transcribe/Contact Lens). Post-call transcript sync is handled by this layer, not by Salesforce native.

## Error handling

- Each CRM sync is wrapped in `.catch()` — one CRM failing does not block the other.
- `Promise.allSettled` ensures both run regardless of individual failures.
- Errors are logged with `[crm-enricher]` prefix for easy filtering.
- If analysis fails, raw session data is synced without enrichment.

## Performance

- `gpt-4o-mini` with `temperature=0` and `json_object` format: ~400–800ms, ~$0.0001–0.0003 per call.
- HubSpot API: ~80–150ms per call.
- Salesforce API: ~100–200ms per call.
- Total post-call processing: ~600ms–1.2s (fully async, does not affect call quality).
