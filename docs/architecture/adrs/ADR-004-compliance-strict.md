# ADR-004: Strict compliance mode by default

**Date**: 2026-05-25
**Status**: Accepted
**Deciders**: flawlessstudio

## Context

Voice agents are subject to TCPA, GDPR, EU AI Act and DNC regulations. A compliance breach can result in significant legal and financial consequences.

## Decision

- `COMPLIANCE_MODE=strict` is the only allowed production setting.
- AI disclosure is mandatory on every first turn.
- DNC check is mandatory before every outbound dial.
- PII redaction is mandatory before any storage.
- Consent capture is mandatory for recorded calls.

## Consequences

- Adds latency to call initiation (DNC check, consent verification).
- Simplifies legal risk management.
- Compliance gate blocks any deployment that does not meet all controls.
