# ADR-002: Redis for session state

**Date**: 2026-05-25
**Status**: Accepted
**Deciders**: flawlessstudio

## Context

Call sessions must survive worker restarts, be accessible across horizontally scaled pods, and expire automatically.

## Decision

Use Redis with TTL for session state. In-memory fallback if Redis is unavailable.

## Consequences

- Redis becomes a required infrastructure dependency.
- Session data is ephemeral (TTL = 1h).
- Must gracefully degrade if Redis is down.
- Adds ~1-5ms latency per session read/write.
