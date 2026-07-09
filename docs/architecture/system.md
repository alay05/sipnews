# System

## Runtimes

- `apps/web`
  - Next.js app
  - Clerk sign-in and account UI
  - onboarding, settings, digest history
- `apps/api`
  - Express API
  - Clerk JWT verification
  - user provisioning, settings, digest reads, feedback writes
- `apps/worker`
  - scheduled prepare and deliver jobs
  - source fetch, clustering, summarization, email delivery

## Current Request Flow

1. User signs in through Clerk on the web app.
2. Web app sends Clerk bearer token to `/v1/me/*`.
3. API verifies the token.
4. API resolves the product user by Clerk subject, then by email if needed.
5. API reads or updates Postgres-backed user settings and digest history.

## Current Worker Flow

1. `prepare` loads source config.
2. Worker fetches articles once globally.
3. Worker normalizes, deduplicates, and clusters stories.
4. Worker stores cluster summaries and summary variants.
5. `deliver` selects clusters by user category counts and summary length.
6. Worker stores the digest and sends email through SendGrid.

## Production URLs

- web: `https://www.sipnewstoday.com`
- api: `https://api.sipnewstoday.com`

## Current Constraints

- Render cron is UTC-only.
- Local and production share one codebase but use separate databases and separate runtime env.
- Source reliability varies by provider, especially GDELT.
