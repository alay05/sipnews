# Request Flow Summary

This is the implemented HTTP flow in `apps/api`.

## Server Startup

1. `apps/api/src/index.ts` calls `loadEnv()`.
2. `createStore(env)` chooses `PgStore` when `DATABASE_URL` is set, otherwise `InMemoryStore`.
3. `buildApp(env, store)` wires Express middleware, summarizer, SMS client, email client, digest pipeline, and routers.
4. The API listens on `PORT`.

## Daily Digest Request

1. A scheduler or operator calls `POST /jobs/daily-digest`.
2. `apps/api/src/routes/jobs.ts` validates the `x-job-secret` header against `JOB_SECRET`.
3. The route loads and filters sources from `SOURCES_CONFIG_PATH`.
4. The route seeds the configured personal user when `PERSONAL_PHONE_NUMBER` is present.
5. Active users are loaded from the store.
6. `DigestPipeline.run()` executes once per active user.

## Pipeline

1. Determine the user's local date and reuse an existing same-day digest when present.
2. Save configured source metadata.
3. Fetch each source through its adapter.
4. Normalize URLs and article content.
5. Filter stale articles by `MAX_ARTICLE_AGE_DAYS`.
6. Save articles.
7. Dedupe articles into story clusters.
8. Rank clusters using recency, source priority, category balance, and stored preferences.
9. Summarize selected clusters with OpenAI when configured, or the local stub otherwise.
10. Save the digest and digest items.
11. Send email when `SEND_EMAIL=true`.
12. Skip SMS when `SEND_SMS=false`.

## Other Routes

- `GET /health`: basic liveness response.
- `GET /d/:digestId`: returns a stored digest.
- `GET /f/:signedToken`: records signed link feedback.
- `POST /webhooks/twilio/inbound`: legacy SMS feedback route.

## API Base URLs

- `PUBLIC_BASE_URL` is the API's externally reachable URL, used to build links and validate webhook URLs.
- `VITE_API_BASE_URL` is the web client's browser-visible API URL.
- `API_BASE_URL` is reserved for server-side worker-to-API calls if needed.
