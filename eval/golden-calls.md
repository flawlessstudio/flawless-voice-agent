# Golden Calls

Curated call transcripts used as ground truth for evaluation.

## Format

```json
{
  "id": "gc_001",
  "scenario": "outbound-qualification",
  "path": "fast",
  "transcript": [...],
  "expected_outcome": "qualified",
  "expected_handoff": false,
  "expected_turns": 6
}
```

## Scenarios covered

- [ ] Outbound qualification: success
- [ ] Outbound qualification: DNC check fail
- [ ] Outbound qualification: prospect not interested
- [ ] Deep path: objection handling
- [ ] Deep path: budget objection
- [ ] Handoff: caller requests human
- [ ] Handoff: negative sentiment trigger
- [ ] Fallback: latency budget exceeded
- [ ] Fallback: circuit breaker open
