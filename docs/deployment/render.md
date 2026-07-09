# Render

Render is production-only in the current repo model. Development does not run on Render; it runs
locally against the dev-only database and Clerk development instance. There is no shared Render
development or staging environment right now.

SendGrid is different: it is used in both local development and production. Local
`npm run worker:deliver` runs can send real email from your machine, while production delivery
runs send through the Render `sipnews-worker-deliver` service.

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

## Auto Deploy

- `sipnews-web`: Render dashboard is set to auto deploy only after CI passes.
- `sipnews-api`: Render dashboard is set to auto deploy only after CI passes.
- `render.yaml` does not currently pin this setting, so keep the dashboard values aligned if services are recreated.

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
- `DATABASE_URL=postgresql://...sslmode=verify-full`
- `CLERK_JWT_ISSUER=https://...`
- `CLERK_SECRET_KEY=sk_live_...`
- `CLERK_JWT_AUDIENCE=` if unused

Production Render services do not use the local-only `DATABASE_ENV`,
`DATABASE_RESET_ALLOWED`, or `DATABASE_BOOTSTRAP_ALLOWED` flags. Those guardrails exist only for
local development and destructive/bootstrap scripts.

### `sipnews-worker-prepare`

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4.1-mini`
- `SUMMARY_PROMPT_VERSION=worker-v1`
- `SOURCES_CONFIG_PATH=../../config/sources.json`
- `SOURCE_FETCH_TIMEOUT_MS=15000`
- `MAX_ARTICLE_AGE_DAYS=7`
- `THE_GUARDIAN_API_KEY`

### `sipnews-worker-deliver`

- `DATABASE_URL`
- `SENDGRID_API_KEY`
- `DIGEST_EMAIL_FROM`
- `PUBLIC_BASE_URL=https://www.sipnewstoday.com`

## Secret Placement

- `sipnews-web`: Clerk browser publishable key plus `CLERK_SECRET_KEY` for server-rendered Clerk integration
- `sipnews-api`: database connection plus Clerk JWT verification and Clerk secret for email resolution fallback
- `sipnews-worker-prepare`: database plus source-fetch/summarization secrets only
- `sipnews-worker-deliver`: database plus delivery secrets only, including SendGrid

Keep worker secrets split by mode. Do not add `SENDGRID_API_KEY` to prepare or `OPENAI_API_KEY` to deliver unless the runtime behavior changes again.

## Access Control

`ALLOWED_USER_EMAILS` has been removed from the API contract. Production sign-up and access gating
should live in Clerk configuration and product user activation, not in a temporary API env
allowlist.

## Alerting Recommendation

Current recommendation:

- use Render service alerts for deploy failures, cron job failures, and repeated restart behavior
- use SendGrid provider alerts for delivery-provider issues
- treat source degradation as an ops review item using `npm run ops:report`, not a paging event, unless prepare runs start failing outright
- page on prepare or deliver run failures; use non-paging review for partial-content or degraded-source warnings

## Domains

- web: `www.sipnewstoday.com`
- api: `api.sipnewstoday.com`

Current desired behavior:

- `sipnewstoday.com` redirects to `www.sipnewstoday.com`

## Source Config

Production workers should point at the committed `config/sources.json` default. Do not point Render
at `config/sources.local.json`; that file is reserved for optional local development overrides and
is intentionally uncommitted.
