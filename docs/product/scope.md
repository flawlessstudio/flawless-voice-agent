# Product Scope

## What this is

A production-ready voice AI agent backend that handles inbound and outbound phone calls, processes speech with AI, and synchronises call data to CRM systems.

## What this is NOT

- A frontend or dashboard
- A call centre platform
- A replacement for human agents in complex scenarios

## Success metrics (v0.1.0)

| Metric | Target |
|---|---|
| Fast path latency | < 1.000ms end-to-end |
| CRM sync success rate | > 99% |
| Twilio signature validation | 100% of webhooks |
| Test coverage | ≥ 60% lines |
| Zero secrets in git | Required |

## Out of scope (v0.1.0)

- Redis session persistence
- Multi-tenant support
- Call recording storage
- Real-time dashboard
- Load balancing
