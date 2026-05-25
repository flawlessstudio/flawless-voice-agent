# API References

Direct links to the official API documentation for every external service in the stack.

## L1 — Telephony

| Service | Reference | Notes |
|---|---|---|
| Twilio Voice | [Voice API](https://www.twilio.com/docs/voice) | Main voice entry point |
| Twilio TwiML | [TwiML Reference](https://www.twilio.com/docs/voice/twiml) | XML response syntax |
| Twilio Media Streams | [Media Streams](https://www.twilio.com/docs/voice/media-streams) | WebSocket audio streaming |
| Twilio Outbound Calls | [Calls Resource](https://www.twilio.com/docs/voice/api/call-resource) | Initiate outbound calls |
| Twilio Status Callbacks | [Status Callbacks](https://www.twilio.com/docs/voice/api/call-resource#statuscallback) | Call lifecycle events |
| Twilio Phone Numbers | [Phone Numbers](https://www.twilio.com/docs/phone-numbers) | Number provisioning |
| Twilio Auth | [API Keys](https://www.twilio.com/docs/iam/api-keys) | Credentials management |

## L2 — STT (Deepgram)

| Service | Reference | Notes |
|---|---|---|
| Deepgram Streaming | [Streaming API](https://developers.deepgram.com/reference/listen-live) | Real-time WebSocket transcription |
| Deepgram Models | [Models Reference](https://developers.deepgram.com/docs/models-languages-overview) | nova-2-phonecall and others |
| Deepgram Auth | [Authentication](https://developers.deepgram.com/docs/authenticating) | API key setup |
| Deepgram Pre-recorded | [Pre-recorded API](https://developers.deepgram.com/reference/pre-recorded) | Async transcription |
| Deepgram Features | [Features](https://developers.deepgram.com/docs/features-overview) | smart_format, interim_results, diarize |

## L3 — LLM (OpenAI)

| Service | Reference | Notes |
|---|---|---|
| OpenAI Realtime API | [Realtime API](https://platform.openai.com/docs/guides/realtime) | Native low-latency voice |
| Realtime Events | [Realtime Events](https://platform.openai.com/docs/api-reference/realtime-client-events) | Full event reference |
| Realtime WebSocket | [WebSocket Guide](https://platform.openai.com/docs/guides/realtime-websocket) | Connection + session management |
| OpenAI Agents SDK | [Agents SDK](https://openai.github.io/openai-agents-python/) | Multi-step tool use |
| Chat Completions | [Chat API](https://platform.openai.com/docs/api-reference/chat) | Standard completions |
| Function Calling | [Function Calling](https://platform.openai.com/docs/guides/function-calling) | Tool use reference |
| OpenAI Models | [Models](https://platform.openai.com/docs/models) | gpt-4o, gpt-4o-realtime-preview |
| OpenAI Auth | [API Keys](https://platform.openai.com/api-keys) | Key management |

## L4 — TTS (ElevenLabs)

| Service | Reference | Notes |
|---|---|---|
| ElevenLabs Text-to-Speech | [TTS API](https://docs.elevenlabs.io/api-reference/text-to-speech) | Standard synthesis |
| ElevenLabs Streaming | [TTS Streaming](https://docs.elevenlabs.io/api-reference/text-to-speech/stream) | Streaming synthesis |
| ElevenLabs Turbo v2.5 | [Turbo Model](https://docs.elevenlabs.io/docs/models) | Low-latency model |
| ElevenLabs Voices | [Voices API](https://docs.elevenlabs.io/api-reference/voices) | List + clone voices |
| ElevenLabs Auth | [Authentication](https://docs.elevenlabs.io/docs/authentication) | xi-api-key header |
| ElevenLabs WebSocket | [WebSocket TTS](https://docs.elevenlabs.io/api-reference/text-to-speech/websockets) | Ultra-low latency |

## L5 — Orchestration

### Vapi

| Service | Reference | Notes |
|---|---|---|
| Vapi Overview | [Vapi Docs](https://docs.vapi.ai) | Main documentation |
| Vapi Calls | [Calls API](https://docs.vapi.ai/api-reference/calls/create) | Create outbound calls |
| Vapi Assistants | [Assistants API](https://docs.vapi.ai/api-reference/assistants/create) | Define agent behavior |
| Vapi Phone Numbers | [Phone Numbers](https://docs.vapi.ai/api-reference/phone-numbers) | Number management |
| Vapi Webhooks | [Webhooks](https://docs.vapi.ai/api-reference/webhooks) | Event callbacks |
| Vapi Auth | [Authentication](https://docs.vapi.ai/authentication) | Bearer token |

### Retell AI

| Service | Reference | Notes |
|---|---|---|
| Retell Overview | [Retell Docs](https://docs.retellai.com) | Main documentation |
| Retell Create Call | [Create Call](https://docs.retellai.com/api-references/create-phone-call) | Outbound call initiation |
| Retell Agents | [Agents API](https://docs.retellai.com/api-references/create-agent) | Agent configuration |
| Retell Webhooks | [Webhooks](https://docs.retellai.com/api-references/webhook) | Event handling |
| Retell Auth | [Authentication](https://docs.retellai.com/authentication) | API key header |

## L6 — Integration / CRM

### HubSpot

| Service | Reference | Notes |
|---|---|---|
| HubSpot Contacts | [Contacts API](https://developers.hubspot.com/docs/api/crm/contacts) | Create + update contacts |
| HubSpot Engagements | [Calls API](https://developers.hubspot.com/docs/api/crm/calls) | Log call activities |
| HubSpot OAuth | [OAuth](https://developers.hubspot.com/docs/api/working-with-oauth) | Auth setup |
| HubSpot Private Apps | [Private Apps](https://developers.hubspot.com/docs/api/private-apps) | API key alternative |
| HubSpot Webhooks | [Webhooks](https://developers.hubspot.com/docs/api/webhooks) | Event subscriptions |

### Salesforce

| Service | Reference | Notes |
|---|---|---|
| Salesforce REST API | [REST API](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/) | Core REST reference |
| Salesforce Leads | [Leads Object](https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm) | Lead upsert |
| Salesforce Activities | [Task Object](https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_task.htm) | Call activity logging |
| Salesforce OAuth | [OAuth 2.0](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_oauth_and_connected_apps.htm) | Auth flow |
| Salesforce Connected Apps | [Connected Apps](https://developer.salesforce.com/docs/atlas.en-us.securityImplGuide.meta/securityImplGuide/connected_app_overview.htm) | App credentials |

## L7 — Analytics / QA

### Watchlist tools

| Service | Reference | Notes |
|---|---|---|
| Hamming | [Hamming Docs](https://docs.hamming.ai) | Voice agent eval platform |
| Braintrust | [Braintrust Docs](https://www.braintrustdata.com/docs) | LLM eval + traces |
| Noveum | [Noveum Docs](https://docs.noveum.ai) | Voice agent production eval |

## Infrastructure

### Redis

| Service | Reference | Notes |
|---|---|---|
| Redis Commands | [Redis Docs](https://redis.io/commands/) | Full command reference |
| node-redis | [node-redis](https://github.com/redis/node-redis) | Node.js client |
| Redis SETEX | [SETEX](https://redis.io/commands/setex/) | TTL key storage |

### Docker

| Service | Reference | Notes |
|---|---|---|
| Dockerfile reference | [Dockerfile](https://docs.docker.com/reference/dockerfile/) | Build instructions |
| Docker Compose | [Compose](https://docs.docker.com/compose/) | Local dev setup |

### Kubernetes

| Service | Reference | Notes |
|---|---|---|
| Deployment | [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) | Pod management |
| HPA | [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) | Autoscaling |
| Secrets | [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) | API key management |

## Compliance references

| Regulation | Reference | Notes |
|---|---|---|
| TCPA | [FCC TCPA](https://www.fcc.gov/consumers/guides/stop-unwanted-robocalls-and-texts) | US outbound call rules |
| DNC Registry | [FTC DNC](https://www.donotcall.gov) | US Do Not Call registry |
| GDPR | [GDPR Full Text](https://gdpr-info.eu) | EU data protection |
| EU AI Act | [EU AI Act](https://artificialintelligenceact.eu) | AI transparency obligations |
| CCPA | [CCPA](https://oag.ca.gov/privacy/ccpa) | California privacy law |

## GitHub Actions

| Service | Reference | Notes |
|---|---|---|
| Actions Docs | [GitHub Actions](https://docs.github.com/en/actions) | CI/CD reference |
| Secrets | [Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) | Secret management |
| Environments | [Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) | Staging + production gates |
