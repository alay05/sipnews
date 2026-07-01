# Worker Flow Summary

`apps/worker` owns the background bucketed digest pipeline. It loads source config, fetches and normalizes articles, persists content through `packages/data`, summarizes clusters with `packages/core` support, and sends due digests by email.

## Implemented Direction

The worker owns execution that does not need to happen inside an HTTP request:

- Scheduled digest runs.
- Source fetching.
- Summarization.
- Email delivery retries.
- Queue consumers and retry/backoff policy.

## Flow

1. Scheduler or operator starts `apps/worker/src/index.ts`.
2. Worker reads `DATABASE_URL`, `SOURCES_CONFIG_PATH`, delivery settings, and model settings.
3. Worker loads source definitions and creates adapters for each enabled source.
4. Worker persists ingestion runs, articles, clusters, summaries, and digests through `packages/data`.
5. Worker uses `packages/core` for deterministic digest logic.
6. Worker sends due digest email through SendGrid when configured.
7. Worker logs a structured `worker_complete` event with run counts.

## Boundaries

- Do not place browser Clerk keys in the worker.
- Do not make the worker depend on Express route modules.
- If the worker calls the API, use `API_BASE_URL` and an explicit auth mechanism.
- If the worker imports shared code, prefer packages over imports from `apps/api/src`.

## Current Env

`apps/worker/.env.example` documents the required worker runtime settings. `SOURCES_CONFIG_PATH` should usually point at `../../config/sources.json` when running through `npm -w @sms-news/worker`.
