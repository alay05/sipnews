# Render

## Services

- `sipnews-web`
- `sipnews-api`
- `sipnews-worker-prepare`
- `sipnews-worker-deliver`

Use the repo-root blueprint in [render.yaml](/Users/andrewlay/sipnews/render.yaml).

Do not use a narrowed `rootDir` like `apps/web`. The build depends on the root workspace layout.

## Commands

- web build: `npm install && npm run build:web`
- web start: `npm run start:web`
- api build: `npm install && npm run build:api`
- api start: `npm run start:api`
- worker build: `npm install && npm run build:worker`
- worker prepare: `npm run run:worker:prepare`
- worker deliver: `npm run run:worker:deliver`

## Current Schedules

- prepare: `0 9 * * *`
- deliver: `0 * * * *`

Note: Render cron is UTC-only. `0 9 * * *` is not fixed to `4:00 AM New York` year-round.

## Required Env Vars

### `sipnews-web`

- `NEXT_PUBLIC_SIPNEWS_API_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app/onboarding`

### `sipnews-api`

- `PORT=10000`
- `PUBLIC_BASE_URL=https://api.sipnewstoday.com`
- `DATABASE_URL=postgresql://...sslmode=verify-full`
- `CLERK_JWT_ISSUER=https://...`
- `CLERK_SECRET_KEY=sk_live_...`
- `CLERK_JWT_AUDIENCE=` if unused
- `ALLOWED_USER_EMAILS=andrewlay05@gmail.com`

### `sipnews-worker-prepare`

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4.1-mini`
- `SUMMARY_PROMPT_VERSION=worker-v1`
- `SOURCES_CONFIG_PATH=../../config/sources.example.json`
- `SOURCE_FETCH_TIMEOUT_MS=15000`
- `MAX_ARTICLE_AGE_DAYS=7`
- `SENDGRID_API_KEY`
- `DIGEST_EMAIL_FROM`
- `PUBLIC_BASE_URL=https://www.sipnewstoday.com`
- `THE_GUARDIAN_API_KEY`

### `sipnews-worker-deliver`

Use the same env vars and values as `sipnews-worker-prepare`.

## Domains

- web: `www.sipnewstoday.com`
- api: `api.sipnewstoday.com`

Current desired behavior:

- `sipnewstoday.com` redirects to `www.sipnewstoday.com`

## Current Production Lesson

Render cannot read local-only `config/sources.json`. Production workers should use the committed `config/sources.example.json` unless a committed production source file is introduced later.
