# Evaluation Metrics

## Latency

| Metric | Formula | Target |
|---|---|---|
| Response latency p50 | median(response_time_ms) | < 600ms |
| Response latency p95 | 95th_pct(response_time_ms) | < 1200ms |
| TTS render time | tts_end - tts_start | < 300ms |
| STT first token | time_to_first_transcript | < 200ms |

## Quality

| Metric | Formula | Target |
|---|---|---|
| WER | (sub+del+ins)/words | < 5% |
| Interruption rate | interruptions/turns | < 3% |
| Goal completion rate | completed_goals/total_calls | > 80% |
| Handoff success rate | successful_handoffs/triggered | > 98% |

## Business

| Metric | Target |
|---|---|
| Qualification rate | Baseline + 15% |
| Conversion rate | Baseline + 10% |
| Drop-off rate | < 2% |
| CRM sync rate | > 99.5% |

## Compliance

| Control | Target |
|---|---|
| AI disclosure | 100% |
| Consent capture | 100% |
| DNC pass rate | 100% |
| PII redaction | 100% |
