# L7 — Analytics / QA

## Core: Custom eval layer

**Why**: No single vendor covers all quality dimensions needed: traces, golden calls, human review, latency scoring, compliance auditing and regression testing. Custom layer is required.

**Components**:
- `eval/run-evals.ts`: eval harness
- `eval/scoring.ts`: score computation
- `eval/golden-calls.json`: ground truth dataset
- `eval/regression-cases.json`: regression suite

## Watchlist

| Candidate | Score | Notes |
|---|---|---|
| Hamming | 8 | Specialized voice eval. Strong automated testing. |
| Braintrust | 8 | Strong LLM eval + traces. Good complement. |
| Noveum | 7 | Voice agent eval platform. Monitor for feature growth. |

## Criteria for promotion
- Must support voice-specific metrics (WER, latency, interruption rate).
- Must support human review workflow.
- Must support regression suite with baseline comparison.
