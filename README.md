# SMS News

SMS News is a TypeScript monorepo for an AI-curated daily news digest. The current implementation exposes an Express API that fetches configured sources, ranks and summarizes article clusters, stores digests, and delivers them by SendGrid email. SMS-related code still exists for feedback and legacy delivery paths, but the restructured repo treats email as the supported delivery channel.

## Workspace Layout

```text
apps/api/       Express API, daily digest endpoint, source adapters, persistence, delivery clients
apps/worker/    Worker workspace scaffold for future async jobs
apps/web/       Web workspace scaffold for future Clerk-authenticated UI
packages/config/     Shared configuration package scaffold
packages/contracts/  Shared API/data contract package scaffold
packages/core/       Shared pure-domain package scaffold
packages/data/       Shared data-access package scaffold
config/         Source configuration files consumed by the API
migrations/     Postgres schema migrations
tests/          Current Vitest suite for API-era behavior
docs/architecture/  Repo map, ownership, flow, and merge guidance
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

For normal local API work, copy the API env example into the API workspace:

```sh
cp apps/api/.env.example apps/api/.env
cp config/sources.example.json config/sources.json
```

Edit `apps/api/.env` and `config/sources.json`, then run:

```sh
npm run dev -w @sms-news/api
```

The API listens on `PORT` and exposes `GET /health`.

## Daily Digest Job

The implemented scheduled job is still owned by `apps/api`:

```sh
curl -X POST http://localhost:3000/jobs/daily-digest \
  -H "x-job-secret: change-me"
```

`POST /jobs/daily-digest` loads sources from `SOURCES_CONFIG_PATH`, seeds the configured user when present, fetches articles, deduplicates and ranks clusters, asks OpenAI for summaries when configured, stores the digest, and sends email when `SEND_EMAIL=true`.

For direct local execution:

```sh
npm run daily -w @sms-news/api
```

Current implementation note: `runDailyDigest.ts` still requires `PERSONAL_PHONE_NUMBER` to seed the user record, even when `SEND_SMS=false`. Treat that variable as legacy identity input until user/account ownership moves behind Clerk.

## Environment Files

Workspace env examples live next to the workspaces that own them:

- `apps/api/.env.example` covers the Express API, job endpoint, source config, OpenAI, Postgres, SendGrid, and legacy SMS toggles.
- `apps/worker/.env.example` covers the worker scaffold and shared service connections it is expected to consume later.
- `apps/web/.env.example` covers public web settings such as Clerk publishable key and API base URL.

The root `.env.example` is only a pointer to those files. New env variables should be added to the owning workspace example and documented in `docs/architecture/workspace-ownership.md`.

## Auth And Web Config

The web workspace is expected to own Clerk browser configuration:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:3000
```

Server-side Clerk verification keys belong in the API workspace when API auth is implemented:

```env
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

Those keys are documented now so agents building the web/API boundary do not invent separate names.

## Source Config Ownership

Source definitions are JSON files under `config/`. The API currently reads them via `SOURCES_CONFIG_PATH`, with `config/sources.example.json` as the template and `config/sources.json` ignored for local edits.

Source config describes external article sources only. It should not carry user identity, Clerk settings, delivery credentials, or API base URLs.

## More Architecture Notes

Read these before moving files or splitting behavior across workspaces:

- `docs/architecture/repo-map.md`
- `docs/architecture/workspace-ownership.md`
- `docs/architecture/request-flow.md`
- `docs/architecture/worker-flow.md`
- `docs/architecture/merge-guidance.md`
