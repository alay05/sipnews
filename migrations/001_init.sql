CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  external_auth_provider TEXT NOT NULL,
  external_auth_subject TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_auth_provider, external_auth_subject)
);

CREATE INDEX IF NOT EXISTS users_external_auth_idx
  ON users (external_auth_provider, external_auth_subject);

CREATE TABLE IF NOT EXISTS user_digest_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  send_hour INTEGER NOT NULL DEFAULT 7 CHECK (send_hour >= 0 AND send_hour <= 23),
  digest_max_items INTEGER NOT NULL DEFAULT 5 CHECK (digest_max_items >= 1 AND digest_max_items <= 25),
  delivery_channel TEXT NOT NULL DEFAULT 'email',
  delivery_address TEXT,
  topic_weights JSONB NOT NULL DEFAULT '{}',
  source_weights JSONB NOT NULL DEFAULT '{}',
  muted_sources TEXT[] NOT NULL DEFAULT '{}',
  preferred_bucket_ids TEXT[] NOT NULL DEFAULT '{}',
  include_bucket_labels BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority REAL NOT NULL DEFAULT 0.5,
  topics TEXT[] NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  source_name TEXT NOT NULL,
  source_priority REAL NOT NULL DEFAULT 0.5,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_hash TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (canonical_url, source_id)
);

CREATE INDEX IF NOT EXISTS articles_canonical_url_idx ON articles (canonical_url);
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON articles (published_at DESC);

CREATE TABLE IF NOT EXISTS story_clusters (
  id TEXT PRIMARY KEY,
  representative_article_id TEXT REFERENCES articles(id),
  canonical_key TEXT,
  title TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS story_clusters_status_last_seen_idx
  ON story_clusters (status, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS story_cluster_articles (
  cluster_id TEXT NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  is_representative BOOLEAN NOT NULL DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cluster_id, article_id)
);

CREATE TABLE IF NOT EXISTS bucket_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bucket_definitions_active_order_idx
  ON bucket_definitions (is_active, sort_order, name);

CREATE TABLE IF NOT EXISTS cluster_bucket_memberships (
  cluster_id TEXT NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL REFERENCES bucket_definitions(id) ON DELETE CASCADE,
  confidence REAL NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  rationale TEXT,
  assigned_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cluster_id, bucket_id)
);

CREATE INDEX IF NOT EXISTS cluster_bucket_memberships_bucket_idx
  ON cluster_bucket_memberships (bucket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cluster_summaries (
  id TEXT PRIMARY KEY,
  cluster_id TEXT NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  why_it_matters TEXT,
  source_links JSONB NOT NULL DEFAULT '[]',
  topics TEXT[] NOT NULL DEFAULT '{}',
  model TEXT,
  prompt_version TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cluster_summaries_cluster_created_idx
  ON cluster_summaries (cluster_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cluster_summary_variants (
  id TEXT PRIMARY KEY,
  cluster_summary_id TEXT NOT NULL REFERENCES cluster_summaries(id) ON DELETE CASCADE,
  cluster_id TEXT NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL,
  title TEXT NOT NULL,
  short_summary TEXT NOT NULL,
  why_it_matters TEXT,
  source_links JSONB NOT NULL DEFAULT '[]',
  topics TEXT[] NOT NULL DEFAULT '{}',
  model TEXT,
  prompt_version TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cluster_summary_id, variant_type)
);

CREATE INDEX IF NOT EXISTS cluster_summary_variants_cluster_type_idx
  ON cluster_summary_variants (cluster_id, variant_type, created_at DESC);

CREATE TABLE IF NOT EXISTS digests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT,
  body_text TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date)
);

CREATE INDEX IF NOT EXISTS digests_user_created_at_idx
  ON digests (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS digest_items (
  id TEXT PRIMARY KEY,
  digest_id TEXT NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  cluster_id TEXT NOT NULL REFERENCES story_clusters(id),
  summary_variant_id TEXT NOT NULL REFERENCES cluster_summary_variants(id),
  bucket_id TEXT REFERENCES bucket_definitions(id),
  item_index INTEGER NOT NULL,
  title_snapshot TEXT NOT NULL,
  summary_snapshot TEXT NOT NULL,
  why_it_matters_snapshot TEXT,
  source_links_snapshot JSONB NOT NULL DEFAULT '[]',
  topics_snapshot TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (digest_id, item_index),
  UNIQUE (digest_id, cluster_id)
);

CREATE INDEX IF NOT EXISTS digest_items_cluster_idx ON digest_items (cluster_id);
CREATE INDEX IF NOT EXISTS digest_items_variant_idx ON digest_items (summary_variant_id);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  articles_seen INTEGER NOT NULL DEFAULT 0,
  articles_saved INTEGER NOT NULL DEFAULT 0,
  clusters_touched INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ingestion_run_sources (
  run_id TEXT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  status TEXT NOT NULL DEFAULT 'running',
  articles_seen INTEGER NOT NULL DEFAULT 0,
  articles_saved INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  PRIMARY KEY (run_id, source_id)
);

CREATE TABLE IF NOT EXISTS delivery_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  digest_id TEXT REFERENCES digests(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  destination TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS delivery_runs_digest_idx ON delivery_runs (digest_id);
CREATE INDEX IF NOT EXISTS delivery_runs_user_queued_idx ON delivery_runs (user_id, queued_at DESC);

CREATE TABLE IF NOT EXISTS feedback_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  digest_id TEXT REFERENCES digests(id) ON DELETE SET NULL,
  digest_item_id TEXT REFERENCES digest_items(id) ON DELETE SET NULL,
  cluster_id TEXT REFERENCES story_clusters(id) ON DELETE SET NULL,
  command TEXT NOT NULL,
  sentiment TEXT,
  topic TEXT,
  source_name TEXT,
  raw_body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_events_user_created_at_idx
  ON feedback_events (user_id, created_at DESC);
