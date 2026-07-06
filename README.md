# Sip

AI-curated news digest platform that turns noisy daily news feeds into concise,
personalized email briefings.

**Live app:** [sipnewstoday.com](https://www.sipnewstoday.com)

---

## Project Overview

Sip is a production-style TypeScript monorepo for personalized news delivery. It
combines a Next.js user app, Clerk authentication, an Express API, a Postgres data
layer, and scheduled Render workers that prepare and deliver AI-assisted email
digests.

**The challenge:** News products are either too broad to be useful or too
expensive to personalize deeply for each user. A naive AI digest system would
summarize stories separately for every user, causing costs to scale linearly with
the user base.

**The solution:** Sip separates global content preparation from per-user digest
assembly. The worker fetches news once, normalizes and deduplicates articles,
builds reusable story clusters, generates cached summary variants, and then
assembles each user's digest from shared content based on onboarding preferences.

**The result:** A deployed full-stack product with authenticated onboarding,
settings, digest history, feedback capture, database-backed delivery records, and
scheduled email delivery.

---

## Key Technical Achievements

### Cost-Aware Personalization Architecture

- Uses onboarding preferences to map users into topic-weighted digest profiles.
- Converts topic weights into bucket quotas so each digest receives a controlled
  mix of relevant stories.
- Reuses shared story clusters and cached summary variants instead of generating
  a fully custom set of AI outputs for every user.
- Stores summary cache keys by cluster, model, prompt version, and summary length
  to support repeatable generation and future prompt upgrades.

### Worker Pipeline

- Fetches configured sources through scheduled Render cron jobs.
- Normalizes raw articles into a shared internal article model.
- Deduplicates overlapping coverage before ranking and summarization.
- Ranks story clusters by relevance, source quality, and user preference signals.
- Generates small, medium, and large summary variants for flexible digest
  assembly.
- Sends completed digests through SendGrid and records delivery state in Postgres.

### Full-Stack Product Surface

- Next.js app with Clerk sign-in, sign-up, onboarding, settings, and digest
  history.
- Express API with Clerk JWT verification for protected user routes.
- Shared DTO validation through `packages/contracts` to keep web and API payloads
  aligned.
- Repository layer in `packages/data` for Postgres persistence and in-memory test
  doubles.
- Feedback endpoint for collecting story-level product signals.

### Production and Operations

- Render blueprint defines web, API, and scheduled worker services.
- Neon-compatible Postgres schema supports users, settings, sources, articles,
  clusters, buckets, summaries, digests, delivery runs, and feedback.
- Environment validation scripts guard local and production runtime config.
- Forward-only migration flow, development-only reset safeguards, and operational
  reporting scripts support safer iteration.

---

## Technology Stack

### Frontend

- Next.js 15
- React 19
- Clerk authentication
- TypeScript

### Backend

- Node.js 22
- Express
- Zod validation
- Clerk JWT verification

### Data and Infrastructure

- Neon-compatible Postgres
- `pg` repository layer
- Render web services and cron workers
- SendGrid email delivery

### AI and Content Processing

- OpenAI summaries
- RSS source ingestion
- GDELT-backed discovery sources
- Article normalization, deduplication, ranking, clustering, and bucketed digest
  assembly

---

## Architecture

```text
User
  |
  v
Next.js Web App -- Clerk session --> Express API -- Postgres
  |                                      |
  |                                      v
  |                              User settings, digests,
  |                              feedback, delivery records
  |
  v
Onboarding preferences

Render Cron Worker
  |
  v
Fetch sources -> Normalize -> Dedupe -> Rank clusters -> Generate summaries
  |
  v
Store shared clusters, bucket memberships, and summary variants
  |
  v
Assemble personalized digests -> Send via SendGrid -> Persist delivery state
```

For a simpler visual explanation of the bucketed personalization system, see
[bucket_architecture.md](bucket_architecture.md).

## Repository Layout

```text
apps/api/            Express API for auth-backed product routes
apps/web/            Next.js and Clerk user app
apps/worker/         Scheduled digest preparation and delivery runtime
packages/contracts/  Shared DTOs and validation schemas
packages/core/       Digest ranking, bucketing, normalization, and dedupe logic
packages/data/       Postgres repositories and in-memory test doubles
config/              Source configuration
migrations/          Postgres schema migrations
scripts/             Env checks, DB tasks, bootstrap, and ops reporting
docs/                Architecture, deployment, and operations notes
render.yaml          Render production blueprint
```

---

## Quick Start

### Prerequisites

- Node.js 22
- npm
- A development Postgres database
- Clerk app credentials
- SendGrid API key for delivery testing
- OpenAI API key for summary generation

### Install

```sh
npm run setup
```

### Configure Local Environment

Create local env files:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
```

Local API and worker env files should point at a development-only Postgres
database. Do not reuse the production `DATABASE_URL` for local runs.

Optional local source overrides:

```sh
cp config/sources.example.json config/sources.local.json
```

If using `config/sources.local.json`, set `SOURCES_CONFIG_PATH` in
`apps/worker/.env` to `../../config/sources.local.json`.

### Run Locally

```sh
npm run dev:api
npm run dev:web
```

The web app runs on the configured Next.js dev port, and the API serves the
authenticated `/v1/me/*` product routes.

### Run Worker Jobs

```sh
npm run worker:prepare
npm run worker:deliver
```

`worker:prepare` fetches and prepares shared content. `worker:deliver` assembles
and sends due user digests.

---

## Database Workflow

Apply forward-only migrations:

```sh
npm run db:migrate
```

For a clean local rebuild:

```sh
npm run db:reset
npm run db:bootstrap
```

Reset and bootstrap commands are intentionally guarded by development-only
environment flags. See [docs/deployment/database-migrations.md](docs/deployment/database-migrations.md)
for details.

---

## API Surface

- `GET /health`
- `GET /v1/me`
- `GET /v1/me/onboarding`
- `PUT /v1/me/onboarding`
- `GET /v1/me/settings`
- `PUT /v1/me/settings`
- `GET /v1/me/digests`
- `GET /v1/me/digests/:id`
- `POST /v1/me/feedback`

---

## Verification

```sh
npm run env:check
npm run verify:fast
npm run verify
npm run test:unit
npm run typecheck
npm run build
```

`verify:fast` runs the default local confidence path. `verify` adds the full
workspace build.

---

## Deployment

Production runs on Render:

- `sipnews-web`: Next.js web app
- `sipnews-api`: Express API
- worker cron services for prepare and deliver jobs

Current production URLs:

- Web: [https://www.sipnewstoday.com](https://www.sipnewstoday.com)
- API: [https://api.sipnewstoday.com](https://api.sipnewstoday.com)

More deployment detail lives in [docs/deployment/render.md](docs/deployment/render.md)
and [docs/deployment/environments.md](docs/deployment/environments.md).

---

## Design Tradeoffs

### Why shared summaries?

Generating summaries per user is simple, but expensive. Sip prepares canonical
cluster summaries once and reuses them across users with similar preferences,
keeping personalization in the selection layer rather than the generation layer.

### Why bucketed onboarding?

Onboarding preferences become structured topic weights. Those weights are
converted into bucket quotas, which gives each digest a predictable mix of
content while still allowing the worker to reuse shared summaries and avoid
duplicated AI calls.

### Why split prepare and deliver?

Prepare jobs handle global content ingestion and summarization. Deliver jobs
handle user-specific assembly and email delivery. This separation makes failures
easier to isolate and prevents a delivery issue from requiring all content to be
fetched and summarized again.

---

## Documentation

- [Bucket architecture](bucket_architecture.md)
- [System architecture](docs/architecture/system.md)
- [Data model](docs/architecture/data-model.md)
- [Render deployment](docs/deployment/render.md)
- [Environment model](docs/deployment/environments.md)
- [Operations runbook](docs/operations/runbook.md)
