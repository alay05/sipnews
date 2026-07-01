# Worker Flow Summary

`apps/worker` is currently a workspace scaffold. Its only implemented behavior is `apps/worker/src/index.ts`, which logs that the worker workspace is ready.

## Intended Direction

When background work moves out of the API, the worker should own execution that does not need to happen inside an HTTP request:

- Scheduled digest runs.
- Source fetching.
- Summarization.
- Email delivery retries.
- Queue consumers and retry/backoff policy.

## Expected Flow After Extraction

1. Scheduler, queue, or API enqueues a digest job.
2. Worker receives the job with a typed contract from `packages/contracts`.
3. Worker loads shared config through `packages/config`.
4. Worker executes pure digest logic from `packages/core`.
5. Worker reads and writes persistence through `packages/data`.
6. Worker emits status or stores results for API/web consumption.

## Boundaries

- Do not duplicate source config parsing in the worker while `apps/api` owns `SOURCES_CONFIG_PATH`.
- Do not place browser Clerk keys in the worker.
- Do not make the worker depend on Express route modules.
- If the worker calls the API, use `API_BASE_URL` and an explicit auth mechanism.
- If the worker imports shared code, prefer packages over imports from `apps/api/src`.

## Current Env

`apps/worker/.env.example` reserves shared names for future worker tasks. Empty `SOURCES_CONFIG_PATH` means source config is not currently worker-owned.
