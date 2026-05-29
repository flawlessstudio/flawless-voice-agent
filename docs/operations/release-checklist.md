# Release Checklist

## Pre-release

- [ ] All CI checks green on `main`
- [ ] `npm test` passes with coverage ≥60%
- [ ] `npm run build` produces clean `dist/`
- [ ] No secrets in git log (`git log --all --full-history -- .env`)
- [ ] `.env.example` is up to date
- [ ] `CHANGELOG.md` updated with release notes
- [ ] Docker image builds locally: `docker build -t flawless-voice-agent .`
- [ ] Health check passes: `docker run -p 5050:5050 --env-file .env flawless-voice-agent`

## Release

```bash
# Bump version in package.json
npm version patch   # or minor / major

# Push tag — triggers release workflow automatically
git push origin main --tags
```

## Post-release

- [ ] GitHub Release created automatically by `release.yml`
- [ ] Docker image `ghcr.io/flawlessstudio/flawless-voice-agent:v0.x.x` published
- [ ] Test production image: `docker pull ghcr.io/flawlessstudio/flawless-voice-agent:latest`
- [ ] Verify `/health` endpoint responds in production
- [ ] Monitor first 10 calls for CRM sync errors in logs
