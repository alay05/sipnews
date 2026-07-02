# Data Model

## Core User Tables

- `users`
  - product user record
  - stores Clerk provider and subject
  - stores email and active state
- `user_digest_settings`
  - timezone
  - send hour
  - digest size
  - summary length
  - category counts
  - delivery channel and address

## Content Tables

- `sources`
  - configured source definitions seen by the worker
- `articles`
  - normalized article records
- `story_clusters`
  - shared cluster identity
- `story_cluster_articles`
  - article membership within a cluster
- `bucket_definitions`
  - current digest categories and related bucket rules
- `cluster_bucket_memberships`
  - cluster-to-bucket assignments

## Summary Tables

- `cluster_summaries`
  - canonical summary per cluster
- `cluster_summary_variants`
  - `small`, `medium`, `large` render variants

## Digest Tables

- `digests`
  - one digest per user per local date
- `digest_items`
  - item snapshots for the delivered digest
- `delivery_runs`
  - email delivery execution history
- `ingestion_runs`
  - prepare-job execution history
- `feedback_events`
  - user feedback tied back to digest and cluster records

## Current Personalization Model

- personalization is stored on the user
- content reuse is stored on clusters and summary variants
- digests point to shared cluster and summary records
- category counts must add up to `digest_max_items`
