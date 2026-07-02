# Sip

Sip is a TypeScript monorepo for an AI-curated email news digest.

Current deployed runtimes:

- `apps/web`: Next.js + Clerk user app
- `apps/api`: Express API for onboarding, settings, digests, and feedback
- `apps/worker`: scheduled digest preparation and delivery

Current production domains:

- web: `https://www.sipnewstoday.com`
- api: `https://api.sipnewstoday.com`

## Repo Layout

```text
apps/api/            Express API
apps/web/            Next.js + Clerk app
apps/worker/         Scheduled digest worker
packages/contracts/  Shared DTOs and validation
packages/core/       Pure digest logic
packages/data/       Repositories and Postgres access
config/              Worker source configuration
migrations/          Postgres schema
scripts/             DB reset and seed helpers
render.yaml          Render blueprint
docs/                Architecture, deployment, operations
roadmap_july2.md     Forward roadmap and work breakdown
```

## Local Setup

Create local env and config files:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
cp config/sources.example.json config/sources.json
```

Install dependencies and validate the workspace env files:

```sh
npm run setup
```

Create a root `.env` only if you plan to run the first-user seed script:

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

Reset and seed the local database:

```sh
npm run db:setup
```

Start local services:

```sh
npm run dev:api
npm run dev:web
```

Manual worker runs:

```sh
npm run worker:prepare
npm run worker:deliver
```

## Core API Routes

- `GET /health`
- `GET /v1/me`
- `GET /v1/me/onboarding`
- `PUT /v1/me/onboarding`
- `GET /v1/me/settings`
- `PUT /v1/me/settings`
- `GET /v1/me/digests`
- `GET /v1/me/digests/:id`
- `POST /v1/me/feedback`

## Worker Model

The worker uses shared assets, not per-user summarization:

1. Fetch sources once
2. Normalize and dedupe articles
3. Build shared story clusters
4. Generate canonical summaries
5. Store `small`, `medium`, and `large` variants
6. Assemble each user digest from the shared cluster pool

## Key Commands

```sh
npm run env:check
npm run verify:fast
npm run verify
npm run test:unit
npm run build
npm run typecheck
npm run build:web
npm run build:api
npm run build:worker
npm run dev:api
npm run dev:web
npm run dev:worker
npm run run:worker:prepare
npm run run:worker:deliver
```

## Documentation

- [AGENTS.md](/Users/andrewlay/sipnews/AGENTS.md)
- [.codex/config.toml](/Users/andrewlay/sipnews/.codex/config.toml)
- [.codex/skills/sipnews-cross-runtime-change/SKILL.md](/Users/andrewlay/sipnews/.codex/skills/sipnews-cross-runtime-change/SKILL.md)
- [docs/architecture/system.md](/Users/andrewlay/sipnews/docs/architecture/system.md)
- [docs/architecture/data-model.md](/Users/andrewlay/sipnews/docs/architecture/data-model.md)
- [docs/agents/architecture.md](/Users/andrewlay/sipnews/docs/agents/architecture.md)
- [docs/agents/change-playbook.md](/Users/andrewlay/sipnews/docs/agents/change-playbook.md)
- [docs/agents/verification.md](/Users/andrewlay/sipnews/docs/agents/verification.md)
- [docs/deployment/environments.md](/Users/andrewlay/sipnews/docs/deployment/environments.md)
- [docs/deployment/render.md](/Users/andrewlay/sipnews/docs/deployment/render.md)
- [docs/operations/runbook.md](/Users/andrewlay/sipnews/docs/operations/runbook.md)
- [roadmap_july2.md](/Users/andrewlay/sipnews/roadmap_july2.md)
