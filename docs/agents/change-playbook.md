# Change Playbook

## Contracts Or Shared Types

- If API request or response shapes change, update `packages/contracts` first.
- Re-run `npm run verify` for contract changes because web, API, and worker can all depend on those builds.

## Digest Logic Or Ranking

- Put reusable algorithm changes in `packages/core`.
- Run `npm run test:unit` and inspect worker tests for regressions in digest assembly.

## Persistence Or Data Access

- Keep DB and repository changes in `packages/data`.
- If a schema assumption changes, update migrations and any docs that describe operational setup.

## API Changes

- Keep route handlers thin and move reusable logic into shared packages when possible.
- If auth, onboarding, settings, or digest payload behavior changes, update the local verification guidance.

## Worker Changes

- Update `apps/worker/.env.example` when runtime requirements change.
- Treat `prepare` and `deliver` as externally integrated paths that can affect providers, logs, and user-visible output.

## Env Or Config Changes

- Update the owning `.env.example`.
- Update `README.md` if setup steps or required values changed.
- Update `config/sources.json`, `config/sources.example.json`, and any `config/sources.local.json` override expectations if source config behavior changes.
