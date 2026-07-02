# Runbook

## End-to-End Local Smoke Test

Use this when you need higher confidence across web, API, worker, and delivery behavior. It is not the default checklist for every merge; the standard pre-merge workflow lives in [docs/deployment/release-workflow.md](/Users/andrewlay/sipnews/docs/deployment/release-workflow.md).

1. copy `apps/api/.env.example`, `apps/worker/.env.example`, and `apps/web/.env.example` if they do not exist yet
2. set `DATABASE_URL` in `apps/api/.env` and `apps/worker/.env` to the same dev-only database and keep `DATABASE_ENV=development`
3. run `npm run env:check`
4. if you need a reset, create a root `.env` for seed-only use with that same dev DB plus `DATABASE_ENV=development` and `DATABASE_RESET_ALLOWED=true`
5. run `npm run db:setup`
6. start API
7. start web
8. sign in through Clerk dev
9. confirm `/app`, `/app/settings`, `/app/onboarding`, `/app/digests`
10. run `npm run worker:prepare`
11. run `npm run worker:deliver`
12. confirm digest in UI and email inbox

## Production Verification

1. open `https://www.sipnewstoday.com`
2. sign in through Clerk production
3. confirm `/app`, `/app/settings`, `/app/onboarding`, `/app/digests`
4. manually trigger `sipnews-worker-prepare`
5. manually trigger `sipnews-worker-deliver`
6. confirm:
   - worker logs show `worker_complete`
   - digest appears in UI
   - digest email arrives

## Health Checks

- web: homepage loads
- api: `GET https://api.sipnewstoday.com/health` returns `{"ok":true}`
- prepare worker: latest run finishes successfully
- deliver worker: latest run finishes successfully

## Common Failures

### API deploy fails on startup

Usually missing:

- `CLERK_JWT_ISSUER`
- `DATABASE_URL`
- `CLERK_SECRET_KEY`

### Local env validation fails for database safety

Usually one of:

- local `apps/api/.env` or `apps/worker/.env` is missing `DATABASE_ENV=development`
- root `.env` is missing `DATABASE_ENV=development`
- root `.env` is missing `DATABASE_RESET_ALLOWED=true`
- a local file is still pointing at a production DB and should be replaced with a dev-only connection string

### Worker prepare fails to start

Usually missing:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `THE_GUARDIAN_API_KEY` if Guardian sources are enabled

If `SOURCES_CONFIG_PATH` is set, confirm it points to the committed `config/sources.json` or to an
existing local-only override at `config/sources.local.json`.

### Worker deliver runs with `dueUsers: 0`

Usually the user `send_hour` does not match the current local hour.

### Source warnings during prepare

Current known non-fatal behavior:

- GDELT can return `429`
- some RSS sources can time out
- worker should continue if other sources still succeed
