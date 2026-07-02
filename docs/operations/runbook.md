# Runbook

## Local Verification

1. `npm run db:setup`
2. start API
3. start web
4. sign in through Clerk dev
5. confirm `/app`, `/app/settings`, `/app/onboarding`, `/app/digests`
6. run `npm run worker:prepare`
7. run `npm run worker:deliver`
8. confirm digest in UI and email inbox

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

### Worker prepare fails to start

Usually missing:

- `SOURCES_CONFIG_PATH`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `THE_GUARDIAN_API_KEY` if Guardian sources are enabled

### Worker deliver runs with `dueUsers: 0`

Usually the user `send_hour` does not match the current local hour.

### Source warnings during prepare

Current known non-fatal behavior:

- GDELT can return `429`
- some RSS sources can time out
- worker should continue if other sources still succeed
