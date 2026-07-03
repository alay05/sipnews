# Hidden Shared-Bucket Personalization Plan

## Status

- Draft architecture and implementation plan
- Intended as an execution spec for a future implementation agent
- This document does not change current behavior by itself

## Summary

Sipnews should move from fixed public digest categories (`world`, `tech`, `ai`, `startups`) to a hidden shared-bucket system.

Users should not see or manage buckets directly. They should simply describe the kind of news they want. Internally, Sipnews should:

1. Parse that request into a structured interest profile
2. Compare it against existing hidden buckets
3. Reuse an existing bucket when the request is similar enough
4. Create a new hidden bucket when no existing bucket is a strong match
5. Fetch, cluster, rank, and summarize content once for shared use
6. Deliver the right hidden buckets and summary lengths to each user

The system must preserve the main cost-saving property of the current architecture:

- shared source ingestion
- shared clustering
- shared summary generation
- shared summary variants (`small`, `medium`, `large`)
- lightweight per-user delivery selection

## Product Intent

### User-facing behavior

- Users enter free-text preferences such as:
  - "I want practical AI engineering news and startup funding"
  - "Give me defense tech, chip manufacturing, and US policy that affects builders"
- Users should feel like Sipnews is directly tailoring news to them
- Users should not know that hidden buckets exist
- Users should not manually pick categories or bucket names
- Users should be able to refine preferences later in natural language

### Internal behavior

- Hidden buckets are the durable personalization asset
- Users may map to one or more hidden buckets
- Multiple users may share the same hidden bucket
- Broad user requests may split into multiple hidden buckets internally
- Narrow user requests should only reuse an existing bucket when match quality is high

## Locked Decisions

- Hidden buckets are fully internal and never exposed as a primary UI concept
- Shared bucket reuse is preferred when similarity is high enough
- Reuse must be conservative to protect personalization quality
- A single user may subscribe to multiple hidden buckets
- Broad requests may be split into multiple hidden buckets automatically
- If coverage is weak, Sipnews should under-fill the digest rather than broaden too aggressively
- Users should be able to refine interests later with free-text steering
- Hidden buckets should be mostly stable over time, with controlled background merge and split logic
- Article discovery may be automatic, but permanent source adoption should be stricter than article discovery
- Early versions should bias toward personalization quality over maximum bucket reuse
- Existing shared summary reuse should be preserved
- Storage should stay on Postgres/Neon and use `pgvector`, not a separate vector datastore

## Why This Approach

This is the best fit for the repo and cost goals because it keeps the expensive parts shared:

- fetch sources once
- normalize once
- dedupe and cluster once
- summarize once
- generate `small` / `medium` / `large` variants once

Per-user work should mostly be:

- interpret preference text
- match user to hidden buckets
- choose the right bucket items and summary length
- deliver the digest

This is an evolution of the current architecture, not a rewrite of the whole system.

## Current Repo Fit

Current repo assumptions already align with a shared-content model:

- `apps/worker` fetches sources globally
- `packages/core` contains bucketing and ranking logic
- `apps/worker/src/pipeline.ts` stores shared story clusters and shared summary variants
- `apps/api` stores per-user digest settings
- `apps/web` exposes onboarding and settings forms

Current limitations that must change:

- onboarding and settings are built around public fixed category counts
- worker bucketing is hard-coded to `world`, `tech`, `ai`, `startups`
- bucket definitions are currently global category labels, not dynamic hidden intent groups
- delivery assumes a fixed pool per category

## Target Architecture

### High-level model

The future system should have five layers:

1. Shared content preparation
2. Intent parsing and normalization
3. Hidden bucket canonicalization and reuse
4. Bucket candidate refresh
5. Per-user digest delivery

### Layer 1: shared content preparation

Keep the current shared model:

- fetch articles globally from configured sources and discovery providers
- normalize and dedupe articles
- cluster stories
- generate shared canonical summaries
- generate `small`, `medium`, and `large` summary variants
- persist shared cluster data for later reuse

This layer should remain independent of individual users.

### Layer 2: intent parsing and normalization

When a user enters or updates a preference statement:

- call an LLM with structured output
- parse the user’s request into structured intent data
- normalize duplicates, contradictory constraints, domain names, and common aliases

The normalized internal structure should include fields like:

- `rawPrompt`
- `normalizedIntentText`
- `themes`
- `excludedThemes`
- `entities`
- `excludedEntities`
- `preferredDomains`
- `excludedDomains`
- `regions`
- `languages`
- `recencyPreference`
- `digestItemTargets`
- `confidence`
- `warnings`

The LLM should not directly decide final bucket identity. It should only generate a structured description of intent.

### Layer 3: hidden bucket canonicalization and reuse

This is the core architectural component.

For each normalized user intent slice:

1. Generate a canonical bucket query spec
2. Generate an embedding for that spec
3. Compare it to existing hidden buckets
4. Reuse a bucket only if:
   - semantic similarity is above threshold
   - hard filters are compatible
   - scope is not meaningfully broader or narrower in a way that would drift results
5. Otherwise create a new hidden bucket

Bucket identity must be based on normalized structured intent, not raw free text.

### Layer 4: bucket candidate refresh

Each hidden bucket should have a background refresh process that:

- embeds the bucket query
- retrieves candidate shared clusters from the global corpus
- applies metadata and exclusion filters
- ranks candidates
- materializes a top candidate set for delivery reuse

If coverage is weak:

- first try broader retrieval against the shared corpus
- then run targeted article discovery
- do not immediately add new permanent sources just because one bucket is underfilled

This layer should produce a reusable ranked candidate set per hidden bucket.

### Layer 5: per-user digest delivery

Delivery should:

- look up a user’s hidden bucket memberships
- read the cached candidate set for those buckets
- select top items without cross-bucket duplication
- choose the summary variant based on user `summaryLength`
- assemble and deliver the digest

Delivery should not depend on live source fetching or live external discovery.

## Hidden Bucket Semantics

### Bucket visibility

- Hidden buckets are internal only
- Users never directly edit bucket names or IDs
- Digest emails may use human-friendly section headings, but those are presentation artifacts, not user-managed taxonomy

### Bucket reuse policy

- Reuse only when overlap is strong
- Do not merge users into a bucket just because the prompts share a few keywords
- Prefer creating a new bucket over reusing a loose match early on
- Loosen thresholds later only after feedback data supports it

### Bucket splitting

Broad prompts may create multiple hidden buckets internally.

Example:

- User prompt: "AI infrastructure, startup funding, and chip manufacturing"
- Internal split:
  - bucket A: AI infrastructure
  - bucket B: startup funding
  - bucket C: semiconductors / chip manufacturing

This improves both retrieval quality and hidden bucket reuse across users.

### Bucket stability

Buckets should be durable and mostly stable once created.

Allowed background operations:

- merge near-duplicate hidden buckets
- split buckets that become too broad
- retire dead buckets with no users

These operations should be explicit system behaviors, not incidental side effects.

## Data Model Changes

### Existing tables that likely remain

- `users`
- `user_digest_settings`
- `sources`
- `articles`
- `story_clusters`
- `story_cluster_articles`
- `cluster_summaries`
- `cluster_summary_variants`
- `digests`
- `digest_items`
- `delivery_runs`
- `ingestion_runs`
- `feedback_events`

### Existing tables that must change meaning

#### `bucket_definitions`

Current meaning:

- fixed public digest categories

Future meaning:

- hidden shared bucket registry

Add or repurpose fields to support:

- hidden bucket ID
- bucket scope
- canonical query text
- normalized query spec JSON
- owner/provenance metadata
- status
- item target defaults
- quality metadata
- timestamps

### New tables

#### `user_hidden_bucket_memberships`

Purpose:

- map users to hidden buckets

Fields:

- `user_id`
- `bucket_id`
- `assignment_source`
- `assignment_confidence`
- `is_active`
- `created_at`
- `updated_at`

#### `bucket_embeddings`

Purpose:

- store embeddings for hidden bucket query specs

Fields:

- `bucket_id`
- `embedding`
- `model`
- `dimensions`
- `prompt_hash`
- `updated_at`

#### `cluster_embeddings`

Purpose:

- store embeddings for shared story clusters

Fields:

- `cluster_id`
- `embedding`
- `model`
- `dimensions`
- `content_hash`
- `updated_at`

#### `bucket_cluster_candidates`

Purpose:

- persist ranked candidate clusters per hidden bucket

Fields:

- `bucket_id`
- `cluster_id`
- `rank`
- `score`
- `match_reason`
- `retrieval_source`
- `matched_at`
- `expires_at`

#### `bucket_refresh_jobs`

Purpose:

- background refresh queue for hidden buckets

Fields:

- `bucket_id`
- `reason`
- `status`
- `attempt_count`
- `scheduled_at`
- `started_at`
- `finished_at`
- `error_message`

### Existing user settings changes

`user_digest_settings` should stop treating `category_counts` as the main personalization input.

Likely replacements:

- `interest_prompt`
- `interest_prompt_version`
- keep `summary_length`
- keep `digest_max_items`
- keep `timezone`
- keep `send_hour`
- keep `source_weights` or evolve them into richer steering later

Legacy category-count data may remain temporarily during migration.

## Contracts And API Changes

### `packages/contracts`

Remove the assumption that users select explicit public category counts.

Introduce DTOs for:

- interest preview request
- interest preview response
- saved interest profile
- hidden-bucket-backed digest item labels
- natural-language refinement requests

### API behavior

Add an endpoint for intent preview before persistence.

Suggested flow:

1. web sends free-text preference prompt
2. API returns normalized preview and warnings
3. web saves accepted preferences
4. API assigns or creates hidden buckets

Suggested endpoint additions:

- `POST /v1/me/preferences/preview`
- `PUT /v1/me/preferences`

Current onboarding and settings routes may be updated instead of adding new routes if the implementation keeps route surface small.

### Digest DTO behavior

Digest items should no longer expose fixed categories as the primary concept.

Instead, snapshots should support:

- item title
- item summary
- why-it-matters
- source links
- topics
- optional presentation section label

The persisted digest must snapshot presentation labels so future hidden bucket changes do not rewrite historical digests.

## Web App Changes

### Onboarding

Replace current category count inputs with:

- a free-text preference textarea
- digest length controls
- summary length controls
- standard delivery controls

Optional UI behavior:

- "Tell us what you want to follow"
- a preview of interpreted interests
- warnings when request is vague or contradictory

Do not expose raw hidden bucket IDs or names.

### Settings

Users should be able to:

- update the text describing the news they want
- adjust `digestMaxItems`
- adjust `summaryLength`
- adjust delivery timing
- refine preferences later

### Refinement UX

Later follow-up text should be supported, such as:

- "More chip manufacturing, less consumer AI"
- "Focus more on startup funding than AI product launches"

This should influence hidden bucket membership or hidden bucket weighting without exposing the bucket layer.

## Worker Changes

### Current worker split

Current modes:

- prepare
- deliver

### Future worker split

Recommended modes:

- `prepare`
  - shared ingestion, normalization, clustering, summary generation
- `refresh-buckets`
  - hidden bucket candidate refresh and targeted discovery
- `deliver`
  - per-user digest assembly and delivery from cached candidates

`deliver` should remain cheap and deterministic relative to `prepare` and `refresh-buckets`.

### Prepare behavior

Keep current responsibilities and add:

- embedding generation for new or changed clusters

### Refresh-buckets behavior

For each stale or newly created hidden bucket:

- embed the canonical bucket query
- search shared cluster embeddings
- apply filters
- materialize ranked candidates
- trigger targeted discovery if recall is weak
- persist candidate set

### Deliver behavior

For each due user:

- load active hidden bucket memberships
- load ranked candidates for those buckets
- dedupe overlapping clusters across buckets
- select the correct summary variant
- assemble digest
- send digest

If a bucket is underfilled:

- prefer sending fewer high-quality items
- only fill from adjacent candidates if relevance still passes a strict threshold

## Source Discovery Policy

### Shared corpus first

Always search the shared corpus first.

### Targeted discovery second

When shared recall is weak:

- run targeted discovery using a query derived from the hidden bucket

Candidate provider options:

- NewsAPI
- GDELT query generation
- optional OpenAI web search fallback

### Permanent source adoption

Do not permanently elevate a discovered domain to a durable source immediately.

Recommended distinction:

- article discovery can be automatic
- source promotion should require stronger repeated evidence or explicit review rules

This avoids source list explosion and low-quality source creep.

## Similarity And Matching Rules

This area is the main architectural risk.

The bucket matching system should use both:

- semantic similarity via embeddings
- hard compatibility checks via normalized structured filters

Examples of hard incompatibility:

- one request excludes a domain the other depends on
- one request is region-specific while the other is global
- one request is startup funding only while the other is broad startup culture

Recommended policy:

- high similarity alone is not enough
- reuse must require both semantic closeness and compatible constraints

## Storage And Infra

### Database

Use the existing Postgres/Neon setup.

Enable:

- `pgvector`

Reason:

- keeps retrieval in the same store as the rest of the app
- avoids operational complexity of a separate vector DB
- fits the current repo better than introducing new infrastructure

### Dependencies

Likely additions:

- `pgvector` Node integration for `pg`

Continue using:

- `openai`
- `pg`
- `zod`

### Env changes

Likely new env vars:

- API:
  - `OPENAI_API_KEY`
  - `INTENT_MODEL`
- Worker:
  - `EMBEDDING_MODEL`
  - `EMBEDDING_DIMENSIONS`
  - `NEWSAPI_API_KEY`
  - hidden bucket refresh tuning vars

## Summary Generation Policy

The hidden bucket system should preserve shared summary reuse.

For each selected shared story cluster:

- generate one canonical summary
- generate three delivery variants:
  - `small`
  - `medium`
  - `large`

Users should receive the variant that matches their settings.

Do not generate custom per-user summaries in V1.

Reason:

- higher cost
- weaker cache reuse
- more operational complexity
- unnecessary for the hidden shared-bucket model

## Migration Strategy

### Principle

Do not do a destructive cutover.

### Suggested phases

1. Add new hidden bucket tables and vector support
2. Add intent preview and save flow
3. Backfill legacy users into hidden buckets derived from current category settings
4. Add hidden bucket refresh worker
5. Switch delivery to hidden bucket candidate selection
6. Remove fixed-category assumptions after stability is proven

### Legacy mapping

Existing nonzero category counts can be converted into hidden buckets during migration.

Example:

- `world=2, tech=3, ai=0, startups=0`

could become:

- a hidden world bucket membership
- a hidden tech bucket membership

This is a compatibility bridge only, not the end-state product model.

## Testing Plan

### Unit tests

Add unit coverage for:

- prompt normalization
- bucket split logic
- bucket reuse threshold logic
- hard compatibility checks
- candidate ranking
- cross-bucket dedupe
- digest fill/underfill logic

### Repository/integration tests

Add integration coverage for:

- hidden bucket creation
- hidden bucket reuse
- vector search queries
- candidate materialization
- digest item snapshot stability

### Worker tests

Add worker coverage for:

- shared prepare flow with embeddings
- hidden bucket refresh flow
- underfilled niche buckets
- targeted discovery trigger
- deliver without live discovery
- multi-user reuse of the same hidden bucket

### Acceptance scenarios

At minimum verify:

- two very similar user prompts reuse the same hidden bucket
- two superficially similar but materially different prompts do not reuse the same bucket
- one broad user prompt splits into multiple hidden buckets
- one niche prompt produces a smaller but relevant digest
- summary length selection still reuses shared variants

## Risks And Failure Modes

### 1. Incorrect bucket reuse

Risk:

- users get grouped into the same hidden bucket when they should not be

Mitigation:

- conservative thresholds
- hard filter compatibility checks
- explicit monitoring of drift and feedback

### 2. Too many near-duplicate buckets

Risk:

- hidden bucket reuse is too strict and the system creates many almost-identical buckets

Mitigation:

- offline merge rules
- duplicate detection
- later threshold tuning using real data

### 3. Low-coverage niche interests

Risk:

- some hidden buckets have too little content

Mitigation:

- smaller digest allowed
- targeted discovery
- source promotion process

### 4. Source sprawl

Risk:

- automatic discovery permanently pollutes source inventory

Mitigation:

- separate article discovery from source adoption

### 5. Delivery latency or instability

Risk:

- delivery depends on too much live work

Mitigation:

- materialize bucket candidates ahead of time
- keep `deliver` separate from live discovery

### 6. Migration complexity

Risk:

- old fixed-category users and new hidden-bucket users coexist awkwardly

Mitigation:

- phased rollout
- temporary dual support

## Out Of Scope For V1

- exposing buckets in the UI
- full conversational onboarding agent
- per-user rewritten summaries
- permanent autonomous source curation without review rules
- aggressive real-time retrieval during delivery
- automatic full taxonomy management visible to users

## Recommended Default Threshold Philosophy

Until production feedback exists:

- be conservative about sharing buckets
- be conservative about broadening weak buckets
- be conservative about source promotion
- be aggressive about sharing fetched, clustered, and summarized content

This preserves quality while still protecting the compute and storage savings that motivated the hidden shared-bucket model.

## Implementation Notes For Future Agent

- Treat this as a contracts-first, cross-runtime change
- Keep business logic in shared packages where possible
- Keep API handlers thin
- Keep worker delivery cheap
- Preserve historical digest snapshots
- Prefer dual-write / dual-read migration steps over hard cutovers
- Do not expose hidden bucket semantics to end users unless later product requirements explicitly change
