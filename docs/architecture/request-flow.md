# Request Flow Summary

This is the implemented product/API flow after the worker cutover.

## Server Startup

1. `apps/api/src/index.ts` calls `loadEnv()`.
2. `createProductDataAccess(env)` chooses Postgres-backed product data access.
3. `buildApp(env, productData)` wires Clerk auth middleware and product routes.
4. The API listens on `PORT`.

## Authenticated Product Request

1. The web app sends a Clerk bearer token to `/v1/me/*`.
2. `apps/api/src/auth/clerk.ts` verifies the token using `CLERK_JWT_ISSUER` and optional `CLERK_JWT_AUDIENCE`.
3. `apps/api/src/routes/me.ts` normalizes the Clerk identity, looks up the Clerk primary email when needed, and optionally enforces `ALLOWED_USER_EMAILS`.
4. If the user does not exist yet, the API provisions a generalized internal user record and default digest settings.
5. The route reads or updates onboarding/settings/digest data through `packages/data`.

## Worker Digest Pipeline

1. A scheduler starts `apps/worker/src/index.ts`.
2. The worker loads sources from `SOURCES_CONFIG_PATH`.
3. It fetches and normalizes articles once per run.
4. It deduplicates articles into shared story clusters.
5. It persists canonical cluster summaries and `small` / `medium` / `large` summary variants.
6. It selects digest items per user from shared bucket pools using per-user settings.
7. It stores digests and sends due email deliveries.

## Other Routes

- `GET /health`: basic liveness response.
- `GET /v1/me`: current authenticated account.
- `GET/PUT /v1/me/onboarding`: onboarding state and save.
- `GET/PUT /v1/me/settings`: settings state and save.
- `GET /v1/me/digests`: digest history.
- `GET /v1/me/digests/:id`: digest detail.
- `POST /v1/me/feedback`: feedback persistence.

## API Base URLs

- `PUBLIC_BASE_URL` is the externally reachable base URL used by the current runtime.
- `NEXT_PUBLIC_SMS_NEWS_API_URL` is the web client's browser-visible API URL.
