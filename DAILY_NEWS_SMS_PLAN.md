# Daily AI News SMS Digest

## Summary

Build a personal, single-user MVP that ingests selected news sources once per day, deduplicates overlapping stories, summarizes the highest-value clusters with AI, and sends a compact SMS digest with links plus reply commands for feedback.

Research basis: RSS gives title/link/description/guid fields suitable for article discovery and dedupe; NewsAPI is useful for discovery but its free plan is development-only and does not provide full article text; Guardian and GDELT offer richer official APIs; OpenAI Responses API is the recommended text-generation path, Structured Outputs should be used for schema-safe summaries, and embeddings support search/recommendations/clustering; Twilio supports inbound SMS webhooks, but US app-to-person SMS requires A2P 10DLC registration and SMS length should stay tight.

References:

- https://www.rssboard.org/rss-specification
- https://newsapi.org/pricing
- https://open-platform.theguardian.com/access/
- https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/amp/
- https://platform.openai.com/docs/guides/text?api-mode=responses
- https://platform.openai.com/docs/guides/structured-outputs
- https://platform.openai.com/docs/guides/embeddings
- https://www.twilio.com/docs/usage/webhooks/messaging-webhooks
- https://www.twilio.com/docs/sms/a2p-10dlc
- https://www.twilio.com/docs/glossary/what-sms-character-limit

## Key Changes

- Scaffold a TypeScript backend with PostgreSQL + `pgvector`, a scheduled daily worker, and a small admin/source config surface.
- Source adapters:
  - Start with RSS feeds and official APIs.
  - Support source configs by `rss`, `newsapi`, `guardian`, `gdelt`, and optional `openai_web_search` with allowed domains.
  - Avoid broad scraping in v1 except for sources whose terms allow it.
- Data model:
  - `sources`: source type, URL/API config, topic filters, priority.
  - `articles`: canonical URL, title, source, published time, excerpt/body, hash, embedding.
  - `story_clusters`: deduped story groups with representative article and related URLs.
  - `digests` / `digest_items`: generated daily SMS and full web digest.
  - `feedback_events` / `user_preferences`: reply history, topic/source weights, preference embedding.
- Public endpoints:
  - `POST /webhooks/twilio/inbound` for SMS replies.
  - `GET /d/:digestId` for the full digest.
  - `GET /f/:signedToken` for one-tap feedback links.
  - `POST /jobs/daily-digest` protected scheduler endpoint.

## Implementation

- Daily pipeline:
  - Fetch all configured feeds/APIs.
  - Normalize articles by canonical URL, title, source, timestamp, excerpt, and available body.
  - Deduplicate by exact canonical URL/GUID, normalized title similarity, and embedding similarity.
  - Rank clusters by recency, source priority, story frequency, novelty, and personal preference score.
  - Generate structured AI output per selected cluster: `title`, `short_summary`, `why_it_matters`, `source_links`, `topics`, and `sms_text`.
  - Send top 3-5 items by SMS and include a full digest link.
- SMS format:
  - Keep under roughly 1,200-1,500 GSM-7 characters; avoid emojis and curly quotes because Unicode reduces SMS segment capacity.
  - Example commands: `+2`, `-3`, `more AI`, `less politics`, `mute CNN`, `save 1`, `why 4`.
- Feedback refinement:
  - Parse deterministic commands first.
  - Use AI structured extraction for free-form replies like "more local business, less election drama."
  - Update source/topic weights immediately.
  - Update preference embedding from liked/disliked article clusters with decay so recent feedback matters more.
  - Use signed feedback links as a more reliable fallback when SMS replies are ambiguous.

## Test Plan

- Unit test source adapters with fixture RSS/API responses.
- Test canonical URL normalization and duplicate clustering for same URL, same headline from multiple outlets, and near-duplicate summaries.
- Test AI summary schema validation and retry behavior on invalid output.
- Test SMS body length, GSM-7 safety, and fallback to full-digest link when content is too long.
- Test Twilio inbound handling for `STOP`, `START`, `HELP`, numbered feedback, source mutes, and free-form preference replies.
- Test ranking before and after positive/negative feedback to confirm personalization changes future digests.

## Assumptions

- This is a personal MVP for one US recipient first, not a multi-user SaaS.
- Default stack is TypeScript, Node.js, PostgreSQL, `pgvector`, OpenAI, and Twilio.
- NewsAPI is only used for development unless upgraded to a production-allowed paid plan.
- The first production version sends a concise SMS plus a full web digest link rather than trying to fit every article into one text.
