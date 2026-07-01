# Sip

Sip is a TypeScript monorepo for an AI-curated email news digest. The current system has three deployed runtimes:

- `apps/web`: Next.js account UI with Clerk auth
- `apps/api`: Express API for onboarding, settings, digest history, and feedback
- `apps/worker`: scheduled bucketed digest worker

## Repo Layout

```text
apps/api/            Express API
apps/web/            Next.js + Clerk account UI
apps/worker/         Scheduled digest pipeline
packages/contracts/  Shared DTO and validation schemas
packages/core/       Pure digest logic: normalize, dedupe, rank, buckets
packages/data/       Repositories and Postgres access
config/              Worker source configuration
migrations/          Postgres schema
scripts/             DB setup/reset helpers
render.yaml          Render blueprint for web/api/cron services
docs/                Architecture and deployment notes
```

## Local Setup

Install dependencies from the repository root:

```sh
npm install
```

Create local config files:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
cp config/sources.example.json config/sources.json
```

Create a root `.env` for first-user database seeding:

```env
DATABASE_URL=postgresql://...&sslmode=verify-full
FIRST_USER_EMAIL=andrewlay05@gmail.com
FIRST_USER_DISPLAY_NAME=Andrew
FIRST_USER_TIMEZONE=America/New_York
FIRST_USER_SEND_HOUR=7
FIRST_USER_DIGEST_MAX_ITEMS=10
FIRST_USER_SUMMARY_LENGTH=medium
FIRST_USER_CATEGORY_COUNTS=world=2,tech=4,ai=3,startups=1
```

Recommended local startup:

```sh
npm run db:setup
npm run dev -w @sipnews/api
npm run dev -w @sipnews/web -- --port 3001
```

Manual worker runs:

```sh
npm run worker:prepare
npm run worker:deliver
```

## Environment Files

- `apps/api/.env`: `DATABASE_URL`, Clerk verification, API allowlist
- `apps/worker/.env`: database, OpenAI, SendGrid, Guardian, source config
- `apps/web/.env`: Clerk browser config and API base URL
- root `.env`: one-time first-user seed values only

Use `sslmode=verify-full` in every Postgres `DATABASE_URL`.

## Product API

Authenticated routes:

- `GET /health`
- `GET /v1/me`
- `GET /v1/me/onboarding`
- `PUT /v1/me/onboarding`
- `GET /v1/me/settings`
- `PUT /v1/me/settings`
- `GET /v1/me/digests`
- `GET /v1/me/digests/:id`
- `POST /v1/me/feedback`

The API provisions a generalized internal user record from Clerk identity, persists user digest settings, and serves digest history from Postgres.

## Worker Model

The worker does not summarize per user. It:

1. Fetches and deduplicates stories once per run
2. Builds shared story clusters
3. Creates one canonical cluster summary
4. Stores `small`, `medium`, and `large` variants
5. Assembles each user digest from the shared pool based on category counts and summary length

This is the active bucketed/shared-summary backend model.

## Render

This repo includes a Render blueprint at [render.yaml](/Users/andrewlay/sipnews/render.yaml).

Deployment notes:

- Use repo-root build commands, not `rootDir: apps/...`
- Render cron schedules are UTC, not timezone-aware
- `worker:prepare` is configured for `0 9 * * *` in the blueprint, which is `4:00 AM` Eastern during standard time and drifts by one hour during daylight saving time

See [docs/deployment/render.md](/Users/andrewlay/sipnews/docs/deployment/render.md) for the full account-by-account setup checklist.

## Useful Commands

```sh
npm run build
npm run typecheck
npm test
npm run build:web
npm run build:api
npm run build:worker
npm run run:worker:prepare
npm run run:worker:deliver
```
