# Verified Notifications Triage (Global and Repo)

This procedure cleans the GitHub notifications inbox safely by marking `Done` only when the
underlying resource is verified as resolved.

## Why this exists

Blindly clearing the inbox hides unresolved work. This runbook enforces evidence-based triage:

1. Verify resource state first.
2. Mark `Done` only for verified-resolved notifications.
3. Keep open or non-verifiable notifications visible for follow-up.

## Official references

1. GitHub REST API notifications: `GET /notifications`, `GET /repos/{owner}/{repo}/notifications`, and thread actions.
2. GitHub notification reasons (`ci_activity`, `review_requested`, etc.) in REST docs.
3. GitHub notification inbox behavior (`Done`, `Saved`, `Unsubscribe`) in user docs.

## Decision model (MECE)

Every thread is classified into exactly one bucket:

1. `verified_resolved`: resource is terminal/resolved.
2. `verified_open`: resource is open/active.
3. `unverifiable`: state cannot be proven with available API evidence.

And mapped to exactly one action:

1. `mark_done` for `verified_resolved`.
2. `keep` for `verified_open` and `unverifiable`.

## Verification rules

### PullRequest

- `merged_at` present → `verified_resolved`.
- `state=closed` → `verified_resolved`.
- `state=open` → `verified_open`.

### Issue / Discussion

- `state=closed` → `verified_resolved`.
- `state=open` → `verified_open`.

### CheckSuite / CI

- If check suite status is `completed` → `verified_resolved`.
- If check suite status is `queued`/`in_progress`/`waiting` → `verified_open`.
- If subject state is not directly available but reason is `ci_activity`, GitHub defines this as a completed workflow run notification, so it is treated as `verified_resolved`.

### Missing subject URL or inconclusive payload

- If no reliable terminal/open signal exists → `unverifiable` and `keep`.

## Commands

### Global inbox (dry-run)

```powershell
pwsh ./scripts/run-notifications-triage.ps1 -Scope global
```

### Global inbox (apply done only for verified-resolved)

```powershell
pwsh ./scripts/run-notifications-triage.ps1 -Scope global -Apply
```

### Single repository (dry-run / apply)

```powershell
pwsh ./scripts/run-notifications-triage.ps1 -Scope repo -Repo owner/repo
pwsh ./scripts/run-notifications-triage.ps1 -Scope repo -Repo owner/repo -Apply
```

## Output artifacts

The script writes:

1. `notifications_report.json` (full evidence and summary)
2. `open_or_unverifiable.csv` (items that remain visible)
3. `done_candidates.csv` (items eligible for done)

Default output folder: `eval/notifications/<timestamp>/`.

## Mandatory review checklist

Before running `-Apply`:

1. `mark_done` count looks correct.
2. `unverifiable` items reviewed and accepted to remain.
3. No critical open items are misclassified.

After running `-Apply`:

1. Re-run dry-run and compare summary deltas.
2. Confirm `mark_errors_count=0`.
3. Export report for audit trail.
