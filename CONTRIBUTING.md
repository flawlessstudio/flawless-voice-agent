# Contributing

## Process

1. Fork the repo.
2. Create a branch from `main`.
3. Make your changes.
4. Run `npm run lint && npm run typecheck && npm run test`.
5. Open a pull request.

## Gates

All PRs must pass:
- Lint
- Typecheck
- Unit tests
- Schema validation
- Registry consistency check
- Eval smoke tests
- Compliance check

## Registry changes

Changes to `registry/registry.core.json` require explicit justification in the PR description.
Changes to `registry/registry.watchlist.json` are open but must include a reason and score.

## Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).
