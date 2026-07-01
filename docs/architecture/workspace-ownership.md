# Workspace Ownership

Use this document when deciding where a file, env variable, or future extraction belongs.

## apps/api

Owns implemented HTTP behavior:

- Express app construction and routing.
- `GET /health`.
- `POST /jobs/daily-digest`.
- Digest read and signed feedback routes.
- Twilio webhook route while legacy SMS feedback remains in the API.
- Source adapter execution.
- OpenAI summarization client.
- SendGrid email delivery.
- Postgres and in-memory store selection.
- Server-side secrets, including `DATABASE_URL`, `OPENAI_API_KEY`, `SENDGRID_API_KEY`, `JOB_SECRET`, `FEEDBACK_SECRET`, and future `CLERK_SECRET_KEY`.

The API currently owns source config loading through `SOURCES_CONFIG_PATH`. Keep source definitions in `config/` and API env examples unless another task explicitly moves source fetching to the worker.

## apps/worker

Owns future background execution:

- Queue consumers or scheduled workers once introduced.
- Long-running source fetch, ranking, summarization, or email jobs after they are moved out of HTTP request handling.
- Worker-only operational env, queue names, retry settings, and worker concurrency.

Current state: `apps/worker/src/index.ts` is a scaffold. Do not document worker behavior as implemented until code exists.

## apps/web

Owns future browser UI:

- Clerk browser integration.
- Public API base URL.
- Client-side routes, components, and user interaction.
- Public `VITE_*` variables only.

The web workspace should use `VITE_API_BASE_URL` for API calls and `VITE_CLERK_PUBLISHABLE_KEY` for Clerk browser auth. It must not receive server secrets.

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
- Delivery ownership: email delivery is supported through API-owned SendGrid settings. SMS settings are legacy and should default to disabled in examples.
- Auth ownership: `VITE_CLERK_PUBLISHABLE_KEY` belongs to `apps/web`; `CLERK_SECRET_KEY` and Clerk webhook secrets belong to `apps/api`.
- Package extraction should preserve behavior and tests before changing runtime flow.
