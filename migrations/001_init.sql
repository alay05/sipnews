CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  display_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  send_hour INTEGER NOT NULL DEFAULT 7 CHECK (send_hour >= 0 AND send_hour <= 23),
  digest_max_items INTEGER NOT NULL DEFAULT 5 CHECK (digest_max_items >= 1 AND digest_max_items <= 10),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_hash TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(1536),
  UNIQUE (canonical_url, source_id)
);

CREATE INDEX IF NOT EXISTS articles_canonical_url_idx ON articles (canonical_url);
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON articles (published_at DESC);

CREATE TABLE IF NOT EXISTS story_clusters (
  id TEXT PRIMARY KEY,
  representative_article_id TEXT NOT NULL REFERENCES articles(id),
  title TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  article_ids TEXT[] NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  local_date DATE NOT NULL,
  sms_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  recipient_phone TEXT,
  UNIQUE (user_id, local_date)
);

CREATE INDEX IF NOT EXISTS digests_user_created_at_idx ON digests (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS digest_items (
  id TEXT PRIMARY KEY,
  digest_id TEXT NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  cluster_id TEXT NOT NULL REFERENCES story_clusters(id),
  item_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  short_summary TEXT NOT NULL,
  why_it_matters TEXT,
  source_links JSONB NOT NULL DEFAULT '[]',
  topics TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (digest_id, item_index)
);

CREATE TABLE IF NOT EXISTS feedback_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  digest_id TEXT REFERENCES digests(id),
  item_index INTEGER,
  command TEXT NOT NULL,
  sentiment TEXT,
  topic TEXT,
  source_name TEXT,
  raw_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_events_user_created_at_idx ON feedback_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  topic_weights JSONB NOT NULL DEFAULT '{}',
  source_weights JSONB NOT NULL DEFAULT '{}',
  muted_sources TEXT[] NOT NULL DEFAULT '{}',
  preference_embedding vector(1536),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
