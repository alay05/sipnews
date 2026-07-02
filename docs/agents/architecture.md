# Agent Architecture Notes

## Runtime Boundaries

- `apps/web` owns browser UI, Clerk session UX, and API calls.
- `apps/api` owns authenticated product endpoints, user provisioning, and Postgres-backed settings and digest reads.
- `apps/worker` owns global article fetch, clustering, summarization, digest assembly, and delivery.

## Shared Package Expectations

- `packages/contracts` is the source of truth for DTOs and validation shapes shared across app boundaries.
- `packages/core` should stay deterministic and side-effect free where possible.
- `packages/data` is the only shared layer that should know about DB pools, repositories, and persistence details.

## Request And Delivery Flow

1. User signs in through Clerk in `apps/web`.
2. Web calls `/v1/me/*` with the Clerk bearer token.
3. API verifies auth and resolves the product user.
4. API reads or updates Postgres-backed user settings and digest history.
5. Worker fetches sources once globally, builds shared story clusters, stores summaries, then assembles per-user digests from the shared pool.

## Design Defaults

- Prefer shared package changes over duplicating logic across app workspaces.
- Prefer adding tests next to the layer that owns the behavior.
- If a change crosses web, API, and worker boundaries, treat it as a contracts-first change.
