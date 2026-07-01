# Workspace Ownership

Use this document when deciding where a file, env variable, or future extraction belongs.

## apps/api

Owns implemented HTTP behavior:

- Express app construction and routing.
- `GET /health`.
- Authenticated `/v1/me/*` product routes.
- Clerk JWT verification and generalized user provisioning.
- Postgres-backed user, settings, digest, and feedback access through `packages/data`.
- Server-side secrets, including `DATABASE_URL`, `CLERK_JWT_ISSUER`, `CLERK_JWT_AUDIENCE`, and optional `ALLOWED_USER_EMAILS`.

## apps/worker

Owns background execution:

- Scheduled worker execution.
- Long-running source fetch, ranking, summarization, and email jobs that run outside HTTP request handling.
- Worker-only operational env, queue names, retry settings, and worker concurrency.
- Source config loading through `SOURCES_CONFIG_PATH`.
- SendGrid delivery and OpenAI summarization runtime settings.

Current state: `apps/worker/src/index.ts` runs the bucketed digest worker against `packages/core` and `packages/data`.

## apps/web

Owns future browser UI:

- Clerk browser integration.
- Public API base URL.
- Client-side routes, components, and user interaction.
- Public `NEXT_PUBLIC_*` variables only.

The web workspace should use `NEXT_PUBLIC_SMS_NEWS_API_URL` for API calls and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for Clerk browser auth. It must not receive server secrets.

## packages/config

Owns reusable typed configuration helpers after extraction. Do not move app-specific secrets into this package unless the package exposes typed readers consumed by an app.

## packages/contracts

Owns shared TypeScript contracts for API responses, request bodies, jobs, events, and DTOs. Contracts should not import Express, database clients, or browser frameworks.

## packages/core

Owns pure domain logic such as normalization, dedupe, ranking, recency filtering, feedback parsing, and email body construction after extraction. Core should stay deterministic and avoid direct process env, database, HTTP, or vendor SDK access.

## packages/data

Owns persistence interfaces, migrations-adjacent data access, and database implementations after extraction. Keep SQL and Postgres-specific logic here once moved.

## Cross-Cutting Rules

- Source config ownership: `config/*.json` defines article sources. It does not own user identity, Clerk settings, delivery credentials, or API base URLs.
- Delivery ownership: email delivery is supported through worker-owned SendGrid settings.
- Auth ownership: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` belongs to `apps/web`; Clerk JWT verification settings belong to `apps/api`.
- Package extraction should preserve behavior and tests before changing runtime flow.
