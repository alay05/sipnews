# Repo Map

This repository is already operating as a multi-runtime monorepo.

## Root

- `package.json`: npm workspaces and root scripts
- `package-lock.json`: lockfile
- `.env.example`: pointer for workspace env files plus first-user seed values
- `render.yaml`: Render blueprint for web, api, and worker cron services

## Applications

- `apps/web`: Next.js app with Clerk sign-in, onboarding, settings, and digest history
- `apps/api`: Express API with Clerk JWT verification and Postgres-backed product routes
- `apps/worker`: bucketed digest pipeline for fetch, cluster, summarize, and deliver

## Shared Packages

- `packages/contracts`: shared request and response schemas
- `packages/core`: deterministic digest logic
- `packages/data`: repository types and Postgres implementations

## Runtime Assets

- `config/sources.example.json`: template source list
- `config/sources.json`: local source config
- `migrations/001_init.sql`: canonical schema
- `scripts/db-migrate.mjs`: schema reset/apply script
- `scripts/db-seed-first-user.mjs`: clean first-user seed script

## Tests

- `tests/`: root package tests
- `apps/worker/src/pipeline.test.ts`: worker pipeline coverage
- `packages/core/tests/`: core digest logic coverage
