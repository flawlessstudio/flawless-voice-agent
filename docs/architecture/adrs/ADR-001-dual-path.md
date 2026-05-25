# ADR-001: Dual-path architecture (fast / deep / fallback)

**Date**: 2026-05-25
**Status**: Accepted
**Deciders**: flawlessstudio

## Context

Different call types have fundamentally different latency and reasoning requirements. A single path cannot be optimal for both high-volume qualification and complex enterprise deals.

## Decision

Implement three paths:
- **Fast path**: OpenAI Realtime, latency < 800ms, volume calls.
- **Deep path**: OpenAI Agents + tools + memory, latency < 1500ms, complex calls.
- **Fallback path**: Minimal prompt, no tools, always available.

## Consequences

- Each path must be independently deployable.
- Routing logic must be fast (< 5ms decision).
- Circuit breakers required per path.
- Adds operational complexity vs single path.
