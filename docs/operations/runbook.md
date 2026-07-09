# Runbook

## End-to-End Local Smoke Test

Use this when you need higher confidence across web, API, worker, and delivery behavior. It is not the default checklist for every merge; the standard pre-merge workflow lives in [docs/deployment/release-workflow.md](/Users/andrewlay/sipnews/docs/deployment/release-workflow.md).

This flow is intentionally dev-only. Do not point any local runtime at production services or the
production database while running it.

1. copy `apps/api/.env.example`, `apps/worker/.env.example`, and `apps/web/.env.example` if they do not exist yet
2. set `DATABASE_URL` in `apps/api/.env` and `apps/worker/.env` to the same dev-only database and keep `DATABASE_ENV=development`
3. run `npm run env:check`
4. if you need a reset or bootstrap, create a root `.env` for bootstrap/reset use with that same dev DB plus `DATABASE_ENV=development`, `DATABASE_RESET_ALLOWED=true`, and `DATABASE_BOOTSTRAP_ALLOWED=true`
5. run `npm run db:reset`
6. run `npm run db:bootstrap`
7. start API
8. start web
9. sign in through Clerk dev
10. confirm `/app`, `/app/settings`, `/app/onboarding`, `/app/digests`
11. run `npm run worker:prepare`
12. run `npm run worker:deliver`
13. confirm digest in UI and email inbox

## Production Verification

Use this after production deploys when a change warrants it. Prefer read-only checks first.

1. open `https://www.sipnewstoday.com`
2. sign in through Clerk production
3. confirm `/app`, `/app/settings`, `/app/onboarding`, `/app/digests`
4. confirm `GET https://api.sipnewstoday.com/health` returns `{"ok":true}`
5. inspect the latest Render deploy logs for the affected service
6. if the change is worker- or delivery-sensitive, inspect the latest scheduled worker runs before manually triggering anything
7. confirm:
   - worker logs show `worker_complete`
   - digest appears in UI
   - digest email arrives

Only manually trigger `sipnews-worker-prepare` or `sipnews-worker-deliver` from Render when you
need incident response or a release-specific production check that cannot wait for the normal
schedules. Do not use manual triggers as the default validation path for ordinary merges.

## Production Admin Check

Run this against the target database when you want a repeatable read-only health pass:

```sh
DATABASE_URL=postgresql://... npm run ops:report
```

Use it for:

- latest prepare run status
- latest deliver run status
- digest success volume over the last 24 hours
- recent non-success delivery runs
- source health spot checks from `ingestion_run_sources`

## Failure Runbooks

### Prepare failed

1. inspect the latest `sipnews-worker-prepare` Render logs
2. run `DATABASE_URL=postgresql://... npm run ops:report`
3. check the latest prepare run `errorMessage`, `failureStage`, and `sourceSummary`
4. if failures are isolated to one source, decide whether to disable or downgrade that source instead of blocking the whole run
5. if the failure is env or provider related, fix the secret/config issue and re-run prepare manually

### Deliver failed

1. inspect the latest `sipnews-worker-deliver` Render logs
2. run `DATABASE_URL=postgresql://... npm run ops:report`
3. check recent non-success `delivery_runs` for destination, digest, and provider errors
4. if the failure is provider-wide, check SendGrid status and credentials before retrying
5. after the fix, re-run deliver manually only if the missed delivery window warrants it

### Source degradation

1. inspect prepare logs for `source_fetch_failed`
2. run `DATABASE_URL=postgresql://... npm run ops:report`
3. review per-source failed run counts in the source health section
4. if one source is noisy but prepare still succeeds, treat it as degradation, not an outage
5. if prepare starts failing outright, escalate it as a prepare failure instead

## Health Checks

- web: homepage loads
- api: `GET https://api.sipnewstoday.com/health` returns `{"ok":true}`
- prepare worker: latest run finishes successfully
- deliver worker: latest run finishes successfully
- ops report: latest prepare/deliver summaries and source health look sane

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
- root `.env` is missing `DATABASE_BOOTSTRAP_ALLOWED=true`
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
- per-source failures should still appear in `ingestion_run_sources` and in `npm run ops:report`
