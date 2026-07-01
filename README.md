# SMS News

SMS News is a TypeScript monorepo for an AI-curated daily news digest. The current runtime is split across three workspaces:

- `apps/web`: Clerk-authenticated Next.js account UI.
- `apps/api`: Express product API for authenticated account, onboarding, settings, digest history, and feedback endpoints.
- `apps/worker`: bucketed digest worker that fetches sources once, builds shared clusters and summary variants, and assembles per-user email digests.

## Workspace Layout

```text
apps/api/            Express API for Clerk-authenticated product endpoints
apps/worker/         Background digest worker using shared core/data packages
apps/web/            Clerk-authenticated Next.js UI
packages/config/     Shared configuration package scaffold
packages/contracts/  Shared API/data contracts
packages/core/       Shared pure-domain digest logic
packages/data/       Shared persistence interfaces and implementations
config/              Source configuration files consumed by the worker
migrations/          Postgres schema migrations
tests/               Vitest coverage across legacy and new paths
docs/architecture/   Repo map, ownership, flow, and merge guidance
```

The root package uses npm workspaces:

```sh
npm run dev
npm run build
npm run typecheck
npm test
```

Root scripts delegate to workspace scripts where possible. Do not introduce pnpm, Yarn, or Turborepo for this restructure.

## Local Setup

Install dependencies from the root when dependency sync is part of your task:

```sh
npm install
```

For local setup, copy the workspace env examples you need:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
cp config/sources.example.json config/sources.json
```

Then run the workspaces independently:

```sh
npm run dev -w @sms-news/api
npm run dev -w @sms-news/web
npm run db:setup
```

The API listens on `PORT` and exposes `GET /health` plus authenticated `/v1/me/*` routes.

## Product API

The API owns authenticated account reads and writes:

- `GET /v1/me`
- `GET /v1/me/onboarding`
- `PUT /v1/me/onboarding`
- `GET /v1/me/settings`
- `PUT /v1/me/settings`
- `GET /v1/me/digests`
- `GET /v1/me/digests/:id`
- `POST /v1/me/feedback`

The API provisions a generalized internal user record from Clerk identity on first authenticated access and persists digest settings through `packages/data`.

## Worker

The worker owns scheduled digest generation:

```sh
npm run worker:prepare
npm run worker:deliver
```

It requires `DATABASE_URL`, `OPENAI_API_KEY`, `SENDGRID_API_KEY`, `DIGEST_EMAIL_FROM`, and `SOURCES_CONFIG_PATH`.

Recommended Render schedule:

- `worker:prepare` once daily at `4:00 AM America/New_York`
- `worker:deliver` hourly

Render cron or any scheduler should target the worker entrypoint, not an API route.

## Database Setup

For a clean database:

```sh
npm run db:migrate
npm run db:seed:first-user
```

Or both together:

```sh
npm run db:setup
```

`db:seed:first-user` clears old digests/content tables and seeds the current first user preferences into the clean schema.

## Environment Files

Workspace env examples live next to the workspaces that own them:

- `apps/api/.env.example` covers the Express API, database access, Clerk verification, and optional access gating.
- `apps/worker/.env.example` covers the worker runtime, source config, summarization, and email delivery.
- `apps/web/.env.example` covers Clerk browser settings and the API base URL.

The root `.env.example` is only a pointer to those files. New env variables should be added to the owning workspace example and documented in `docs/architecture/workspace-ownership.md`.

## Auth And Web Config

The web workspace is expected to own Clerk browser configuration:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SMS_NEWS_API_URL=http://localhost:3000
```

Server-side Clerk verification keys belong in the API workspace:

```env
CLERK_JWT_ISSUER=https://...
CLERK_JWT_AUDIENCE=
ALLOWED_USER_EMAILS=you@example.com
```

Those keys are documented now so agents building the web/API boundary do not invent separate names.

## Source Config Ownership

Source definitions are JSON files under `config/`. The worker reads them via `SOURCES_CONFIG_PATH`, with `config/sources.example.json` as the template and `config/sources.json` ignored for local edits.

Source config describes external article sources only. It should not carry user identity, Clerk settings, delivery credentials, or API base URLs.

## More Architecture Notes

Read these before moving files or splitting behavior across workspaces:

- `docs/architecture/repo-map.md`
- `docs/architecture/workspace-ownership.md`
- `docs/architecture/request-flow.md`
- `docs/architecture/worker-flow.md`
- `docs/architecture/merge-guidance.md`
