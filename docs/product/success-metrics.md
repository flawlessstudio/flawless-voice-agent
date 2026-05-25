# Success Metrics

## Quality

| Metric | Formula | Target |
|---|---|---|
| Latency p50 | median(response_time_ms) | < 600ms |
| Latency p95 | 95th_percentile(response_time_ms) | < 1200ms |
| WER | (substitutions + deletions + insertions) / total_words | < 5% |
| Interruption rate | interruptions / total_turns | < 3% |

## Business

| Metric | Formula | Target |
|---|---|---|
| Qualification rate | qualified_leads / total_calls | Baseline + 15% |
| Handoff rate | successful_handoffs / triggered_handoffs | > 98% |
| Conversion rate | conversions / qualified_leads | Baseline + 10% |
| Drop-off rate | dropped_calls / total_calls | < 2% |

## Compliance

| Metric | Target |
|---|---|
| Consent capture rate | 100% |
| AI disclosure rate | 100% |
| DNC check pass rate | 100% |
| PII redaction coverage | 100% |
