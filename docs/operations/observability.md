# Observability Guide

## Overview

Every LLM call, tool call, and CRM sync is traced via the `tracer` utility (`src/utils/tracer.ts`). When Langfuse is configured, all traces are sent to Langfuse. When not configured, events fall back to console — zero breaking changes.

## What gets traced

| Event | Span type | Fields |
|---|---|---|
| OpenAI Realtime session | `generation` | sessionId, model, session config |
| Post-call analysis (gpt-4o-mini) | `generation` | sessionId, transcript length, intent, tokens |
| Tool call execution | `span` | tool name, parameters, result |
| CRM sync (HubSpot) | `span` | sessionId, callId, synced |
| CRM sync (Salesforce) | `span` | sessionId, voiceCallId, synced |
| Agent handoff | `span` | sessionId, target, reason |

## Setup — Cloud (langfuse.com)

1. Create account at https://cloud.langfuse.com
2. Create project → Settings → API Keys
3. Add to `.env`:
```
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```
4. Install package: `npm install langfuse`
5. Restart server — `[tracer] Langfuse connected` in logs confirms it

## Setup — Self-hosted (GDPR-compliant, recommended for EU)

```bash
docker-compose -f infra/langfuse.yml up -d
```

Then open http://localhost:3000, create project, copy keys to `.env` with:
```
LANGFUSE_HOST=http://localhost:3000
```

## What to monitor

### Per-call dashboard
- Latency per layer (STT, LLM, TTS, CRM)
- Token usage per call (cost tracking)
- Tool call success rate
- Interrupt count per call

### Per-campaign dashboard
- Intent distribution (qualify / schedule / support / other)
- Sentiment distribution
- Outcome distribution (success / callback / not_interested)
- Average call duration
- CRM sync success rate

### Quality evals (run via `eval/llm-quality.ts`)
- Intent accuracy score (judge LLM: 0-5)
- Summary faithfulness score (judge LLM: 0-5)
- Sentiment accuracy score (judge LLM: 0-5)

## Langfuse scores

Scores are written back to Langfuse traces using `tracer.score()`:
```ts
tracer.score({
  traceId: '<trace-id>',
  name:    'intent_accuracy',
  value:   4,
  comment: 'Correct intent, minor ambiguity'
});
```

## Flush on shutdown

The server index.ts calls `tracer.flush()` on SIGTERM to ensure no traces are lost:
```ts
process.on('SIGTERM', async () => {
  await tracer.flush();
  process.exit(0);
});
```

## Alternatives

| Tool | Type | When to use |
|---|---|---|
| **Langfuse** | Open source, self-host | Default — GDPR, EU, free tier |
| **LangSmith** | SaaS | If using LangChain/LangGraph |
| **Helicone** | SaaS proxy | Cost tracking focus |
| **Braintrust** | SaaS | Eval datasets + CI scoring |
| **Phoenix (Arize)** | Open source | MLOps + hallucination detection |
