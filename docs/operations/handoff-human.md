# Human Handoff Runbook

## Automatic triggers
- Caller requests human explicitly.
- Negative sentiment detected for 3 consecutive turns.
- Conversation exceeds 15 turns.
- Legal/compliance topic raised.
- Circuit breaker open.

## Manual override
Any agent supervisor can trigger handoff via dashboard.

## Handoff flow
1. Agent summarizes context.
2. Twilio transfer to human agent queue.
3. Context payload sent to human agent CRM screen.
4. Session logged as handed-off.
5. Human agent picks up with full context.

## SLA
- Handoff must complete within 30 seconds.
- Context must be available before human answers.
