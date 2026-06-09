# Daily AI News Digest

A TypeScript/Node.js app that builds a daily AI-curated news digest from configurable sources, stores it in Postgres, and delivers it by SendGrid email. It is currently set up as a solo personal digest, but the data model is user-scoped so it can later expand to a small multi-user version.

The app is designed to run once per day from a scheduled GitHub Action. Each run fetches configured news sources, filters and deduplicates overlapping articles, ranks the best story clusters against the user's preferences, asks OpenAI for concise digest writeups, saves the result, and sends it through the configured delivery channel. Twilio SMS delivery and SMS feedback are supported, but SMS should stay disabled until the sender number is compliant and verified.

## What It Does

- Loads source definitions from `config/sources.json`, including RSS feeds, Guardian API sources, and GDELT discovery sources.
- Fetches articles from every enabled source and continues when individual feeds fail or time out.
- Normalizes article URLs/content, removes duplicates, clusters related stories, and ranks them by source priority, recency, topic balance, and stored user preferences.
- Uses OpenAI to summarize the selected clusters into digest items with bold headings, explanatory descriptions, and relevant article links.
- Stores users, fetched articles, story clusters, digests, digest items, feedback, and preference weights in Postgres.
- Sends the digest by email through SendGrid, with optional Twilio SMS delivery using the same digest content.
- Accepts Twilio SMS feedback like `+1`, `-2`, `more AI`, and `mute CNN`, then updates future ranking preferences.
- Runs daily from GitHub Actions by calling the deployed Render job endpoint.

## How It Works

The application is an Express API with one main scheduled job endpoint. GitHub Actions calls `POST /jobs/daily-digest` at 7:00 AM `America/New_York`, passing `x-job-secret` so the endpoint is not publicly runnable without the shared secret.

The daily pipeline lives in `src/services/digestPipeline.ts`:

1. Load active users and configured sources.
2. Save source metadata to the store.
3. Fetch articles from each source adapter.
4. Normalize article content and canonical URLs.
5. Deduplicate articles into story clusters.
6. Rank clusters using source priority, recency, category balance, and user preferences.
7. Summarize the selected clusters with OpenAI.
8. Save the digest and digest items.
9. Deliver the digest by SendGrid email and, if enabled, Twilio SMS.

The endpoint is idempotent by `user_id` and local date. If today's digest already exists and has been marked sent, rerunning the job returns the existing digest instead of creating and sending a duplicate.

## Repo Structure

```text
src/adapters/      Source-specific fetchers for RSS, Guardian, GDELT, and placeholders
src/config/        Environment, source config, and personal user setup
src/core/          Pure digest logic: normalization, dedupe, ranking, SMS/email formatting, feedback parsing
src/routes/        Express routes for jobs, digests, feedback links, and Twilio webhooks
src/services/      Pipeline orchestration, OpenAI, stores, delivery clients, and feedback service
src/types/         Shared TypeScript types
tests/             Unit tests for adapters, core logic, services, and routes
config/            Source configuration examples
migrations/        Postgres schema
.github/workflows/ Daily GitHub Actions schedule
```

## Local Setup

```sh
npm install
cp .env.example .env
cp config/sources.example.json config/sources.json
```

Edit `.env` and `config/sources.json`, then run:

```sh
npm test
npm run build
npm run dev
```

Trigger a local digest:

```sh
curl -X POST http://localhost:3000/jobs/daily-digest \
  -H "x-job-secret: change-me"
```

## Important Commands

```sh
npm run dev        # local API server
npm run build      # compile to dist/
npm run start      # run compiled server
npm test           # test suite
npm run daily      # run the digest job locally without HTTP
```

## Configuration

Core env vars:

```env
PORT=3000
PUBLIC_BASE_URL=https://your-render-app.onrender.com
SOURCES_CONFIG_PATH=config/sources.json
DATABASE_URL=postgres://...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
JOB_SECRET=...
FEEDBACK_SECRET=...
```

Personal digest settings:

```env
PERSONAL_PHONE_NUMBER=+12025550123
PERSONAL_USER_ID=personal
PERSONAL_DISPLAY_NAME=Andrew
PERSONAL_TIMEZONE=America/New_York
DIGEST_SEND_HOUR=7
DIGEST_MAX_ITEMS=10
```

Email delivery:

```env
SEND_EMAIL=true
SENDGRID_API_KEY=...
DIGEST_EMAIL_FROM=verified-sender@example.com
DIGEST_EMAIL_TO=you@example.com
```

SMS delivery is optional:

```env
SEND_SMS=false
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
TWILIO_VALIDATE_WEBHOOKS=true
```

Use `SEND_SMS=false` while Twilio A2P 10DLC or toll-free verification is incomplete.

Source/debug options:

```env
THE_GUARDIAN_API_KEY=...
SOURCE_FETCH_TIMEOUT_MS=15000
MAX_ARTICLE_AGE_DAYS=7
DISABLE_GDELT=false
```

## Database

Use Neon or any hosted Postgres database. Apply the migration once:

```sh
psql "$DATABASE_URL" -f migrations/001_init.sql
```

If `DATABASE_URL` is not set, the app uses an in-memory store for local development.

## Deployment

Recommended setup:

- **Render Web Service** for the Node app.
- **Neon Postgres** for persistence.
- **SendGrid** for email delivery.
- **Twilio** only if SMS delivery or SMS feedback is enabled.
- **GitHub Actions** for the daily schedule.

Render should build and start with:

```sh
npm run build
npm run start
```

Set the production env vars in Render. Use `PUBLIC_BASE_URL` with the Render URL.

## Scheduling

The workflow in `.github/workflows/daily-digest.yml` runs every day at 7:00 AM `America/New_York` and can also be triggered manually.

Set these GitHub Actions secrets:

```env
DIGEST_JOB_URL=https://your-render-app.onrender.com/jobs/daily-digest
JOB_SECRET=same-value-as-render
```

The job is idempotent by user and local date. If a digest has already been sent today, rerunning the job will reuse it instead of sending a duplicate.

## API Endpoints

- `GET /health` checks that the server is running.
- `POST /jobs/daily-digest` runs the daily digest job. Requires `x-job-secret`.
- `GET /d/:digestId` returns a stored digest as JSON.
- `GET /f/:signedToken` records signed link feedback.
- `POST /webhooks/twilio/inbound` handles Twilio SMS replies.

## Feedback

SMS feedback supports short replies such as:

```text
+1
-2
more AI
less politics
mute CNN
save 1
why 4
HELP
STOP
START
```

Feedback updates stored user preferences and can influence future ranking.

## Sources

Edit `config/sources.json` to control what the digest reads. The example config is weighted toward:

- 20% general world and US news
- 30% tech industry news
- 30% AI, development, and programming news
- 20% startup news

Prefer official APIs and RSS feeds. Some external feeds occasionally time out or return temporary errors; the app logs those failures and continues with the other sources.
