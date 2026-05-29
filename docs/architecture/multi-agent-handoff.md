# Multi-Agent Handoff

## Overview

When Alex (primary agent) detects a handoff trigger, it calls `transfer_call` tool with a reason and summary. The `routeHandoff()` function in `src/agents/handoff.ts` resolves the target and executes the transfer.

## Handoff types

| Reason | Target type | What happens |
|---|---|---|
| `user_requested_human` | `human` | Twilio call transfer to `HUMAN_AGENT_NUMBER` |
| `qualify_success` | `sdr` | Context stored in registry for SDR agent |
| `high_value_lead` | `sdr` | Same as qualify_success |
| `support_escalation` | `support` | Context stored for support agent |

## Sequence

```
Alex (primary agent)
  │
  ├── detects intent = handoff OR user requests human
  │
  ├── calls transfer_call tool
  │     { reason: 'qualify_success', summary: '...' }
  │
  └── toolHandler.ts → routeHandoff(reason, summary, session)
              │
              ├── resolveTarget(reason) → HandoffTarget
              │
              ├── [human] → Twilio call transfer
              │
              └── [AI agent] → AgentContextRegistry.set(agentId, context)
                                │
                                └── Secondary agent reads context on connect
                                     AgentContextRegistry.get(agentId)
```

## Context passed on handoff

```ts
interface HandoffContext {
  sessionId:     string;   // trace continuity
  callSid:       string;   // Twilio call reference
  contactId?:    string;   // CRM contact ID
  summaryToDate: string;   // what was discussed
  intent:        string;   // why handoff happened
  keyFacts?:     string[]; // name, company, budget, etc.
  transcript:    Utterance[];
}
```

## AgentContextRegistry

In-process Map with 30min TTL. For multi-instance production deployments, replace with Redis:

```ts
// Production Redis implementation (example)
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });
await redis.setEx(`handoff:${agentId}`, 1800, JSON.stringify(context));
```

## Env vars required

| Var | Description |
|---|---|
| `HUMAN_AGENT_NUMBER` | Phone number for human agent transfer |
| `TWILIO_TRANSFER_TWIML_URL` | TwiML URL to execute Twilio call transfer |
| `SDR_AGENT_ID` | Vapi/Retell agent ID for SDR agent |
| `SUPPORT_AGENT_ID` | Vapi/Retell agent ID for support agent |
