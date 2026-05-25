# Deep Path

## Purpose
Complex conversations, objections, demos, renewals. Optimized for reasoning and conversion.

## Route
Twilio → Deepgram STT → OpenAI Agents + tools + memory → ElevenLabs → Retell AI → Salesforce

## Latency budget
- Target: < 1500ms
- p95: < 2500ms

## Use cases
- Enterprise deals
- Renewal saves
- Complex objection handling
- High-value demos

## Handoff rules
If conversation exceeds 15 turns OR sentiment negative for 3 consecutive turns, escalate to human.
