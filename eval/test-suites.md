# Test Suites

## Smoke tests
Run on every push. Fast, no external calls.
- Schema validation
- Registry consistency
- Prompt format validation
- Compliance rules check

## Regression tests
Run on PR to main. Uses golden calls dataset.
- Latency regression
- Quality score regression
- Handoff flow tests
- Fallback trigger tests

## Golden call tests
Run weekly. Uses curated call transcripts.
- Qualification flow end-to-end
- Objection handling
- Handoff scenarios
- Edge cases

## Load tests
Run before production releases.
- 100 concurrent calls: baseline
- 1k concurrent calls: pre-production
- 10k concurrent calls: production readiness
