# Release Checklist — v0.1.0

## Pre-release gates

### Functional
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:unit` passes
- [ ] `npm run test:integration` passes
- [ ] `npm run test:e2e` passes
- [ ] `npm run schema:validate` passes
- [ ] `npm run registry:validate` passes

### Eval
- [ ] `npm run eval:smoke` passes
- [ ] `npm run eval:regression` — all RC cases pass
- [ ] `npm run eval:golden` — all 5 golden calls pass

### Compliance
- [ ] `npm run compliance:check` passes
- [ ] AI disclosure present on every first agent turn
- [ ] DNC check fires before every outbound dial
- [ ] PII redaction active on all stored transcripts
- [ ] Consent capture confirmed

### Load
- [ ] `CONCURRENCY=100` load test passes (p95 < 1200ms, error rate < 2%)
- [ ] `CONCURRENCY=1000` load test passes

### Infra
- [ ] All GitHub Secrets configured
- [ ] Staging environment deployed and healthy
- [ ] Twilio webhook configured and tested
- [ ] Redis connection verified

### Docs
- [ ] `docs/product/freeze.md` gates marked
- [ ] `registry/audit-log.md` up to date
- [ ] `CHANGELOG.md` updated
- [ ] `README.md` accurate

## Release steps

1. Merge all pending PRs to `main`.
2. Update `CHANGELOG.md` with release notes.
3. Tag: `git tag v0.1.0 && git push origin v0.1.0`
4. GitHub Actions `deploy.yml` auto-deploys to production.
5. Monitor for 30 minutes post-deploy.
6. Close this checklist.
