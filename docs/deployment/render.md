# Render Deployment

This repo is ready to deploy to Render as four services:

- one web service for `apps/web`
- one web service for `apps/api`
- one cron job for `worker:prepare`
- one cron job for `worker:deliver`

Use the included [render.yaml](/Users/andrewlay/sipnews/render.yaml) as the source of truth.

## Important Constraint

Do not set a Render `rootDir` like `apps/web` or `apps/api` for these services.

This monorepo builds against:

- root `package.json`
- root `package-lock.json`
- sibling workspace packages under `packages/*`

If you narrow `rootDir`, Render will hide those files from the build.

Use repo-root commands plus build filters instead.

## Service Commands

- Web build: `npm install && npm run build:web`
- Web start: `npm run start:web`
- API build: `npm install && npm run build:api`
- API start: `npm run start:api`
- Worker prepare build: `npm install && npm run build:worker`
- Worker prepare run: `npm run run:worker:prepare`
- Worker deliver build: `npm install && npm run build:worker`
- Worker deliver run: `npm run run:worker:deliver`

## Schedules

Render cron uses UTC only.

- Prepare: `0 9 * * *`
- Deliver: `0 * * * *`

`0 9 * * *` corresponds to `4:00 AM` Eastern during standard time and drifts by one hour during daylight saving time. If you need fixed local-time behavior year-round, use an external timezone-aware scheduler later.

## Render Account Steps

1. Connect the GitHub repository for Sip to Render.
2. In Render, create a new Blueprint from the repo, or create services manually using the values from `render.yaml`.
3. Confirm the four services that Render detects:
   - `sipnews-web`
   - `sipnews-api`
   - `sipnews-worker-prepare`
   - `sipnews-worker-deliver`
4. Set the environment variables for each service before the first deploy.
5. Deploy the web and API services first.
6. After the API is healthy, manually trigger the two cron services once from the Render dashboard.
7. Check logs for:
   - web boot success
   - `GET /health` success on API
   - `worker_complete` JSON on both cron jobs

## Clerk Account Steps

1. In Clerk, create a production instance from the current development instance.
2. Add your production app domain and any required DNS records from Clerk's Domains page.
3. Copy the production keys:
   - `pk_live_...`
   - `sk_live_...`
4. Update the Render env vars:
   - web gets the production publishable key and secret key
   - api gets the production secret key and JWT issuer
5. In Clerk, verify redirect URLs still cover:
   - `/sign-in`
   - `/sign-up`
   - `/app`
   - `/app/onboarding`
6. If you later add OAuth providers, configure production credentials in Clerk before going live.

## Neon Account Steps

1. Use the pooled or direct production connection string from Neon.
2. Ensure every `DATABASE_URL` uses `sslmode=verify-full`.
3. Put that URL in:
   - `sipnews-api`
   - `sipnews-worker-prepare`
   - `sipnews-worker-deliver`
4. Run the schema reset and first-user seed locally before the first production deploy if you want the exact same starting state.
5. Once deployed, do not run `db:setup` against production unless you intentionally want a full wipe.

## SendGrid Account Steps

1. Verify the sender address or authenticated domain you want to use for digests.
2. Copy the API key into both worker cron services.
3. Set `DIGEST_EMAIL_FROM` to the verified sender.
4. Send one manual test by triggering the deliver cron service after setting your own send hour to the current hour.

## Guardian Account Steps

1. Generate an API key in The Guardian developer portal.
2. Set `THE_GUARDIAN_API_KEY` on both worker cron services.
3. Re-run `worker:prepare` and confirm the old “has no API key; skipping” warnings are gone.
