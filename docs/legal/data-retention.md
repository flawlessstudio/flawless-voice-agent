# Data Retention

## Defaults

| Data type | Retention period | Justification |
|---|---|---|
| Call recordings | 90 days | Compliance + QA review |
| Transcripts (raw) | 30 days | QA only, then deleted |
| Transcripts (redacted) | 1 year | Business records |
| Session metadata | 2 years | Analytics and audit |
| Consent logs | 5 years | Legal compliance |
| Audit logs | 5 years | Regulatory requirement |

## PII handling

- All transcripts are redacted before storage.
- Names, phone numbers, emails, addresses are masked.
- Redaction runs as a middleware step post-call.

## Deletion requests

- Honor within 30 days (GDPR Art. 17, CCPA).
- Log deletion events in audit log.
