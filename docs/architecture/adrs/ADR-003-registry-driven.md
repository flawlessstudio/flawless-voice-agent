# ADR-003: Registry-driven stack with core/watchlist pattern

**Date**: 2026-05-25
**Status**: Accepted
**Deciders**: flawlessstudio

## Context

The voice AI market moves fast. Winners today may not be winners in 6 months. The stack must be able to evolve without architectural rewrites.

## Decision

Maintain a formal registry with:
- **Core**: frozen winners per layer.
- **Watchlist**: monitored candidates with competitive scores.
- **Audit log**: all changes tracked with dates and reasons.

## Consequences

- Any stack change requires a registry update and audit entry.
- Core changes require a PR with eval evidence.
- Adds governance overhead but prevents ad-hoc stack drift.
