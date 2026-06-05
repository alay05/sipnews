# Daily AI News SMS Digest

This repo is a TypeScript/Node.js scaffold for a personal daily news digest app. It loads configured sources, fetches articles, normalizes and deduplicates them, ranks story clusters, summarizes the top items, sends a Twilio SMS, and accepts inbound SMS feedback.

The implementation is intentionally MVP-sized. It uses an in-memory store at runtime, with a Postgres + `pgvector` migration included for the production data model.

## Getting Started

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create local config:

   ```sh
   cp .env.example .env
   cp config/sources.example.json config/sources.json
   ```

3. Edit `.env` and `config/sources.json`.

4. Run tests and build:

   ```sh
   npm test
   npm run build
   ```

5. Start the API:

   ```sh
   npm run dev
   ```

6. Trigger a digest locally:

   ```sh
   curl -X POST http://localhost:3000/jobs/daily-digest \
     -H "x-job-secret: change-me"
   ```

## Runtime Shape

- `POST /jobs/daily-digest` runs the fetch, dedupe, rank, summarize, and SMS pipeline.
- `POST /webhooks/twilio/inbound` parses Twilio SMS replies such as `+2`, `-3`, `more AI`, `less politics`, `mute CNN`, `save 1`, `why 4`, `HELP`, `STOP`, and `START`.
- `GET /d/:digestId` returns the stored digest JSON.
- `GET /f/:signedToken` records one-tap signed feedback from links.

## Source Configuration

The default example config is tailored to a 20% general, 30% tech industry, 30% AI/dev/programming, and 20% startup mix. It includes 20 enabled sources across BBC, Guardian, GDELT discovery, The Verge, Ars Technica, WIRED, TechCrunch, OpenAI, GitHub, Simon Willison, Hacker News, YC, Product Hunt, and Crunchbase News.

Supported source adapters:

- `rss`
- `guardian`
- `gdelt`
- `newsapi` placeholder
- `openai_web_search`

Guardian sources require `THE_GUARDIAN_API_KEY`. GDELT and RSS sources do not need keys. Do not put broad scraping targets in the default config. Prefer RSS feeds and official APIs whose terms allow your use.

The SMS digest uses a category-balanced selector. For 5 items, it alternates daily between:

- `1 general / 2 tech / 1 AI-dev / 1 startup`
- `1 general / 1 tech / 2 AI-dev / 1 startup`

## Database

Run `migrations/001_init.sql` against Postgres when replacing the in-memory store:

```sh
psql "$DATABASE_URL" -f migrations/001_init.sql
```

The schema includes `pgvector` columns for article and preference embeddings.

## Personalization Model

The current feedback loop is deterministic:

- Positive numbered feedback increases topic and source weights.
- Negative numbered feedback decreases them.
- `more <topic>` and `less <topic>` adjust topic weights.
- `mute <source>` suppresses a source.

The `NewsSummarizer` interface is the handoff point for adding structured AI extraction for free-form preference replies.
