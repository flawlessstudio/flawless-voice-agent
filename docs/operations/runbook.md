# Runbook

## Health check
```bash
curl https://your-domain/health
```

## Key metrics to monitor
- Response latency p95
- Error rate
- Active sessions
- CRM sync queue depth
- Circuit breaker status

## Common issues

### High latency
1. Check LLM worker queue depth.
2. Check TTS queue depth.
3. Check STT streaming connection.
4. If p95 > 1500ms, circuit breaker should auto-trigger fallback.

### CRM sync failures
1. Check HubSpot/Salesforce API status.
2. Check async queue depth.
3. Replay failed events from queue.

### Compliance alert
1. Stop affected call batch immediately.
2. Review audit log.
3. Notify legal if PII breach suspected.
4. File incident report.

### Notification inbox saturation
1. Run verified triage (dry-run first): `pwsh ./scripts/run-notifications-triage.ps1 -Scope global`.
2. Review `verified_open` and `unverifiable` entries in the generated report.
3. Only then apply done for verified-resolved items:
   `pwsh ./scripts/run-notifications-triage.ps1 -Scope global -Apply`.
4. Keep org scope bounded with `-AllowedOrg flawlessstudio` unless explicitly required.
5. If apply is blocked by unverifiable items, resolve or document them before any override.
6. If saturation is mostly `ci_activity`, prioritize CI noise reduction and repository watch tuning.
