# Verification Guide

## Default Checks

- `npm run verify:fast`: default check for most code edits.
- `npm run verify`: full repo check for cross-workspace or release-sensitive changes.
- `npm run env:check`: local bootstrap validation for env files and source config.

## By Change Type

- Web-only UI change:
  - `npm run dev:web`
  - `npm run verify:fast`
- API-only change:
  - `npm run dev:api`
  - `npm run verify:fast`
- Worker-only change:
  - `npm run dev:worker`
  - `npm run test:unit`
  - `npm run verify:fast`
- Shared package or contract change:
  - `npm run verify`
- Env or source config change:
  - `npm run env:check`
  - relevant runtime command after validation

## Notes

- Root `npm test` covers root tests only.
- `npm run test:unit` is the canonical unit test entrypoint because it also runs worker tests.
- `npm run db:setup` mutates the configured database and requires a root `.env`.
