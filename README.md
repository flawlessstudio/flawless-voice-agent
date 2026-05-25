# flawless-voice-agent

The optimal hybrid voice agent platform — dual-path architecture (fast/deep/fallback), registry-driven, compliance-ready, scalable to 10k concurrent calls.

## Stack

| Layer | Winner |
|---|---|
| Telephony | Twilio |
| STT | Deepgram |
| LLM | OpenAI Realtime / Agents |
| TTS | ElevenLabs |
| Orchestration | Vapi + Retell |
| Integration | HubSpot + Salesforce |
| QA / Analytics | Custom eval layer |

## Architecture

- **Fast path**: Twilio → STT → OpenAI Realtime → ElevenLabs → CRM
- **Deep path**: Twilio → STT → OpenAI Agents + tools + memory → Handoff
- **Fallback path**: Controlled degradation → Human or callback

## Structure

```
flawless-voice-agent/
├─ docs/         # Architecture, product, operations, legal
├─ registry/     # Core, watchlist, stack recipes, audit log
├─ schemas/      # JSON schemas for candidates, sessions, audits
├─ eval/         # Metrics, golden calls, regression, scorecards
├─ src/          # Runtime, adapters, integrations, compliance
├─ infra/        # Docker, K8s, Terraform, CI
├─ prompts/      # System, sales, qualification, handoff, fallback
├─ examples/     # Use case examples
└─ tests/        # Unit, integration, e2e, load
```

## Quick start

```bash
npm install
npm run build
npm run test
npm run eval
```

## Gates

1. Functional gate: call, conversation, CRM sync, handoff
2. Quality gate: latency, transcript, conversion, stability
3. Compliance gate: consent, disclosure, privacy, AI Act/TCPA/GDPR
4. Scalability gate: load, p95, queues, fallback, autoscaling
5. Closure gate: registry consistent, stack frozen, docs final

## License

MIT
