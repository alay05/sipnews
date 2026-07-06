# Bucket Architecture

This document explains the bucket system in plain language first, then maps it
to the technical pieces needed to implement it. Treat this as the planned
architecture for the complete bucketed personalization flow, with notes that map
back to the codebase.

## The Simple Version

Imagine Sip is making lunch boxes.

Every morning, it gets a big pile of food:

```text
Apples   Sandwiches   Juice   Cookies   Carrots   Crackers
```

Instead of asking a chef to make a brand-new lunch box from scratch for every
person, Sip first sorts the food into trays:

```text
+-------------+   +-------------+   +-------------+
| Fresh fruit |   | Main food   |   | Snacks      |
| apples      |   | sandwiches  |   | cookies     |
| oranges     |   | wraps       |   | crackers    |
+-------------+   +-------------+   +-------------+
```

Then each person says what they like:

```text
Andrew likes:  more fruit, some main food, fewer snacks
Maya likes:    more main food, some snacks, fewer fruit
```

Sip builds each lunch box by taking a different number of items from the same
shared trays.

That is the bucket system.

For news, the "food" is stories. The "trays" are buckets. The "lunch box" is a
personalized digest.

## Why This Matters

The expensive part of an AI news app is not picking stories. The expensive part
is asking the AI to summarize stories again and again.

Without buckets:

```text
User 1 -> AI summarizes story A
User 2 -> AI summarizes story A again
User 3 -> AI summarizes story A again
```

With buckets:

```text
Story A -> AI summarizes once -> cached summary

User 1 gets cached summary A
User 2 gets cached summary A
User 3 gets cached summary A
```

The product still feels personalized because each user gets a different mix of
stories, but the system avoids repeated AI calls for the same underlying story.

## Full Flow

```text
                 User Onboarding
                       |
                       v
        +-------------------------------+
        | Preferences and topic weights |
        +-------------------------------+
                       |
                       v
        +-------------------------------+
        | Bucket quota calculation      |
        | Example: 5 stories total      |
        | Bucket A: 2, B: 2, C: 1       |
        +-------------------------------+
                       |
                       v
+--------------------------------------------------+
| Shared prepared story pool                       |
|                                                  |
| Bucket A: story 1, story 2, story 3              |
| Bucket B: story 4, story 5, story 6              |
| Bucket C: story 7, story 8, story 9              |
+--------------------------------------------------+
                       |
                       v
        +-------------------------------+
        | Select stories by quota       |
        +-------------------------------+
                       |
                       v
        +-------------------------------+
        | Assemble personalized digest  |
        +-------------------------------+
```

## What Happens During Onboarding

The onboarding form should collect enough information to describe what kind of
digest a user wants.

Examples:

- How many stories should the digest include?
- Which topics does the user care about most?
- How long should summaries be?
- What time should the digest be delivered?

Those answers become structured settings:

```text
digest_max_items: 5
summary_length: medium
topic_weights:
  ai: 3
  tech: 2
  business: 1
  politics: 0
```

Then the bucket engine converts those topic weights into quotas:

```text
5 total stories

Bucket 1: 2 stories
Bucket 2: 2 stories
Bucket 3: 1 story
```

The exact bucket names can change over time. The important idea is that the
system turns messy human preferences into a small, structured selection plan.

## What Happens in the Worker

The worker has two jobs: prepare shared content, then deliver personalized
digests.

### Prepare

```text
Sources
  |
  v
Fetch articles
  |
  v
Normalize articles
  |
  v
Deduplicate similar stories
  |
  v
Rank story clusters
  |
  v
Assign clusters to buckets
  |
  v
Generate and cache summaries
```

The prepare step is global. It does not belong to one user.

It creates reusable building blocks:

- article records
- story clusters
- bucket memberships
- summary variants
- cache keys

### Deliver

```text
Due user
  |
  v
Load settings
  |
  v
Calculate bucket quotas
  |
  v
Select prepared clusters
  |
  v
Pick cached summary variant
  |
  v
Save digest
  |
  v
Send email
```

The deliver step is personal. It uses the user's settings to choose from the
shared prepared content.

## Technical Model

### Core Concepts

```text
Article
  Raw story from a source after normalization.

StoryCluster
  One real-world story represented by one or more related articles.

Bucket
  A reusable group that story clusters can belong to.

BucketMembership
  The link between a story cluster and a bucket.

SummaryVariant
  A cached AI summary for a story cluster at a specific length.

Digest
  The final set of selected story summaries for one user on one date.
```

### Data Shape

```text
users
  id
  clerk_subject
  email

user_digest_settings
  user_id
  digest_max_items
  summary_length
  topic_weights
  category_counts or bucket quotas

story_clusters
  id
  title
  topics
  score

bucket_definitions
  id
  name
  rules
  is_active

cluster_bucket_memberships
  cluster_id
  bucket_id

cluster_summary_variants
  cluster_id
  summary_length
  model
  prompt_version
  cache_key
  text

digests
  user_id
  local_date
  status

digest_items
  digest_id
  cluster_id
  bucket_id
  summary_variant_id
```

## Selection Logic

The bucket engine should do four things.

### 1. Infer Bucket Membership

Each story cluster has topics. The system uses those topics to decide which
bucket the cluster belongs to.

```text
Cluster topics: ["openai", "developer tools", "software"]
        |
        v
Bucket: AI and software
```

In code, this belongs in `packages/core` because it is pure business logic.

### 2. Convert Preferences Into Quotas

User preferences become weights. Weights become story counts.

```text
User wants 6 stories

Topic weights:
  AI: 3
  product: 2
  markets: 1

Bucket quotas:
  AI: 3 stories
  product: 2 stories
  markets: 1 story
```

The quota function should always return whole numbers that add up to
`digest_max_items`.

### 3. Select Ranked Clusters

Within each bucket, clusters are already ranked by quality and relevance.

```text
Bucket A quota: 2

Ranked bucket pool:
  1. Story A
  2. Story B
  3. Story C

Selected:
  Story A
  Story B
```

If a bucket does not have enough stories, the system fills the remaining slots
from the best available fallback stories.

### 4. Reuse Cached Summaries

The summary cache key should include the inputs that change the AI output:

```text
summary_cache_key =
  cluster_id +
  summary_length +
  model +
  prompt_version
```

If the cache key already exists, the worker should reuse that summary. If the
prompt or model changes, the key changes too, and the worker can safely generate
a new version.

## Cost Model

The goal is to make AI cost grow with the number of unique stories, not the
number of users.

Naive approach:

```text
cost = users * stories_per_user * summary_cost
```

Bucketed shared-summary approach:

```text
cost = unique_story_clusters * summary_variants * summary_cost
```

That difference matters as the product grows.

Example:

```text
20 users
5 stories each

Naive:
20 * 5 = 100 summary generations

Bucketed:
25 shared clusters * 3 summary lengths = 75 summary generations

If more users join but read the same shared story pool,
the system can serve them mostly through cached summaries.
```

The exact savings depend on how much user interest overlaps, how many summary
variants are generated, and how often the story pool changes.

## Implementation Plan

### Phase 1: Store Structured Preferences

- Keep onboarding settings in `user_digest_settings`.
- Store preferred topics as weights or bucket counts.
- Validate settings through `packages/contracts`.

### Phase 2: Prepare Shared Buckets

- Fetch and normalize articles in the worker.
- Deduplicate articles into story clusters.
- Infer bucket memberships in `packages/core`.
- Persist memberships in `cluster_bucket_memberships`.

### Phase 3: Generate Shared Summaries

- Generate summaries once per story cluster and summary length.
- Store the model and prompt version with each summary variant.
- Reuse existing variants when the cache key matches.

### Phase 4: Assemble User Digests

- Load due users and their settings.
- Convert preferences into bucket quotas.
- Select ranked clusters from each bucket pool.
- Fill missing slots from fallback ranked content.
- Save digest items with cluster, bucket, and summary references.

### Phase 5: Learn From Feedback

- Record story-level feedback.
- Use feedback to adjust topic weights.
- Improve future bucket quotas without rebuilding the whole architecture.

## Where This Fits in the Repo

```text
apps/web
  Onboarding and settings UI.

apps/api
  Authenticated routes for reading and updating user settings.

apps/worker
  Prepare and deliver jobs.

packages/core
  Pure bucket, ranking, quota, dedupe, and normalization logic.

packages/data
  Postgres repositories for users, settings, clusters, summaries, and digests.

packages/contracts
  Shared validation schemas for web and API payloads.
```

## One-Sentence Summary

The bucket system lets Sip personalize digests by choosing different mixes of
shared, already-summarized story clusters instead of paying the AI to rewrite the
same stories separately for every user.
