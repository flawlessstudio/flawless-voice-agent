# Regression Cases

Known issues that must not regress.

## Format

```
[ID] [DATE] [DESCRIPTION] [EXPECTED] [ACTUAL AT TIME] [STATUS]
```

## Cases

| ID | Date | Description | Expected | Status |
|---|---|---|---|---|
| RC-001 | 2026-05-25 | AI disclosure on first turn | Always present | ✅ Pass |
| RC-002 | 2026-05-25 | DNC check before dial | Always checked | ✅ Pass |
| RC-003 | 2026-05-25 | Handoff on negative sentiment x3 | Escalate to human | ✅ Pass |
| RC-004 | 2026-05-25 | Fallback on latency > 1500ms | Switch to fallback | ✅ Pass |
| RC-005 | 2026-05-25 | PII redacted before storage | No raw PII in DB | ✅ Pass |
