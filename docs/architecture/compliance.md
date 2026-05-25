# Compliance

## Regulatory scope

- TCPA (US outbound calls)
- DNC registry checks
- GDPR (EU data subjects)
- EU AI Act (AI system transparency)
- CCPA (California residents)

## Controls

| Control | Implementation |
|---|---|
| Consent capture | Pre-call consent check + runtime capture |
| AI disclosure | Voice agent identifies itself as AI at call start |
| DNC check | Real-time DNC registry check before dialing |
| PII redaction | Transcripts redacted before storage |
| Data retention | Configurable, default 90 days |
| Audit logging | All sessions logged with consent status |
| Access control | Role-based access to transcripts and recordings |

## EU AI Act

- Agent must identify itself as AI-generated.
- Human handoff must always be available.
- Risk classification: limited risk (transparency obligations apply).

## See also

- [Consent model](../legal/consent-model.md)
- [Data retention](../legal/data-retention.md)
