DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS external_auth_provider TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS external_auth_subject TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
      UPDATE users
      SET
        external_auth_provider = COALESCE(external_auth_provider, 'legacy-sms'),
        external_auth_subject = COALESCE(external_auth_subject, phone_number, id);
    ELSE
      UPDATE users
      SET
        external_auth_provider = COALESCE(external_auth_provider, 'dev'),
        external_auth_subject = COALESCE(external_auth_subject, id);
    END IF;

    ALTER TABLE users ALTER COLUMN external_auth_provider SET NOT NULL;
    ALTER TABLE users ALTER COLUMN external_auth_subject SET NOT NULL;

    BEGIN
      ALTER TABLE users ADD CONSTRAINT users_external_auth_unique
        UNIQUE (external_auth_provider, external_auth_subject);
    EXCEPTION
      WHEN duplicate_table THEN NULL;
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone_number'
  ) THEN
    INSERT INTO user_digest_settings (
      user_id, timezone, send_hour, digest_max_items, delivery_channel, delivery_address
    )
    SELECT
      id,
      COALESCE(timezone, 'America/New_York'),
      COALESCE(send_hour, 7),
      COALESCE(digest_max_items, 5),
      'sms',
      phone_number
    FROM users
    ON CONFLICT (user_id) DO UPDATE SET
      timezone = EXCLUDED.timezone,
      send_hour = EXCLUDED.send_hour,
      digest_max_items = EXCLUDED.digest_max_items,
      delivery_channel = EXCLUDED.delivery_channel,
      delivery_address = EXCLUDED.delivery_address,
      updated_at = now();
  ELSE
    INSERT INTO user_digest_settings (user_id)
    SELECT id FROM users
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF to_regclass('public.user_preferences') IS NOT NULL THEN
    UPDATE user_digest_settings settings
    SET
      topic_weights = COALESCE(preferences.topic_weights, '{}'),
      source_weights = COALESCE(preferences.source_weights, '{}'),
      muted_sources = COALESCE(preferences.muted_sources, '{}'),
      updated_at = now()
    FROM user_preferences preferences
    WHERE settings.user_id = preferences.user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.articles') IS NOT NULL THEN
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_priority REAL NOT NULL DEFAULT 0.5;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
    ALTER TABLE articles DROP COLUMN IF EXISTS embedding;
  END IF;

  IF to_regclass('public.story_clusters') IS NOT NULL THEN
    ALTER TABLE story_clusters ADD COLUMN IF NOT EXISTS canonical_key TEXT;
    ALTER TABLE story_clusters ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE story_clusters ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE story_clusters ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE story_clusters ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
    ALTER TABLE story_clusters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS story_cluster_articles (
  cluster_id TEXT NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  is_representative BOOLEAN NOT NULL DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cluster_id, article_id)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_clusters' AND column_name = 'article_ids'
  ) THEN
    EXECUTE $backfill$
      INSERT INTO story_cluster_articles (cluster_id, article_id, is_representative)
      SELECT cluster_id, article_id, article_id = representative_article_id
      FROM (
        SELECT id AS cluster_id, representative_article_id, unnest(article_ids) AS article_id
        FROM story_clusters
      ) legacy_cluster_articles
      ON CONFLICT (cluster_id, article_id) DO NOTHING
    $backfill$;
  END IF;
END $$;

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

INSERT INTO bucket_definitions (id, name, description, sort_order, rules)
VALUES ('general', 'General', 'Default bucket for legacy and unclassified clusters.', 0, '{}')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS cluster_bucket_memberships (
  cluster_id TEXT NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL REFERENCES bucket_definitions(id) ON DELETE CASCADE,
  confidence REAL NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  rationale TEXT,
  assigned_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cluster_id, bucket_id)
);

INSERT INTO cluster_bucket_memberships (cluster_id, bucket_id, confidence, rationale, assigned_by)
SELECT id, 'general', 1, 'Legacy backfill default bucket', 'migration'
FROM story_clusters
ON CONFLICT (cluster_id, bucket_id) DO NOTHING;

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'digest_items' AND column_name = 'short_summary'
  ) THEN
    EXECUTE $backfill$
      INSERT INTO cluster_summaries (
        id, cluster_id, title, summary, why_it_matters, source_links, topics, metadata
      )
      SELECT
        'legacy-summary-' || id,
        cluster_id,
        title,
        short_summary,
        why_it_matters,
        source_links,
        topics,
        jsonb_build_object('backfilled_from_digest_item_id', id)
      FROM digest_items
      ON CONFLICT (id) DO NOTHING
    $backfill$;

    EXECUTE $backfill$
      INSERT INTO cluster_summary_variants (
        id, cluster_summary_id, cluster_id, variant_type, title, short_summary,
        why_it_matters, source_links, topics, metadata
      )
      SELECT
        'legacy-variant-' || id,
        'legacy-summary-' || id,
        cluster_id,
        'digest',
        title,
        short_summary,
        why_it_matters,
        source_links,
        topics,
        jsonb_build_object('backfilled_from_digest_item_id', id)
      FROM digest_items
      ON CONFLICT (id) DO NOTHING
    $backfill$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.digests') IS NOT NULL THEN
    ALTER TABLE digests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent';
    ALTER TABLE digests ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE digests ADD COLUMN IF NOT EXISTS body_text TEXT;
    ALTER TABLE digests ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE digests ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
    ALTER TABLE digests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'digests' AND column_name = 'sms_body'
    ) THEN
      UPDATE digests
      SET body_text = COALESCE(body_text, sms_body),
          delivered_at = COALESCE(delivered_at, sent_at);
    END IF;
  END IF;

  IF to_regclass('public.digest_items') IS NOT NULL THEN
    ALTER TABLE digest_items ADD COLUMN IF NOT EXISTS summary_variant_id TEXT;
    ALTER TABLE digest_items ADD COLUMN IF NOT EXISTS bucket_id TEXT;
    ALTER TABLE digest_items ADD COLUMN IF NOT EXISTS title_snapshot TEXT;
    ALTER TABLE digest_items ADD COLUMN IF NOT EXISTS summary_snapshot TEXT;
    ALTER TABLE digest_items ADD COLUMN IF NOT EXISTS why_it_matters_snapshot TEXT;
    ALTER TABLE digest_items ADD COLUMN IF NOT EXISTS source_links_snapshot JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE digest_items ADD COLUMN IF NOT EXISTS topics_snapshot TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE digest_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'digest_items' AND column_name = 'short_summary'
    ) THEN
      EXECUTE $backfill$
        UPDATE digest_items
        SET
          summary_variant_id = COALESCE(summary_variant_id, 'legacy-variant-' || id),
          bucket_id = COALESCE(bucket_id, 'general'),
          title_snapshot = COALESCE(title_snapshot, title),
          summary_snapshot = COALESCE(summary_snapshot, short_summary),
          why_it_matters_snapshot = COALESCE(why_it_matters_snapshot, why_it_matters),
          source_links_snapshot = COALESCE(source_links_snapshot, source_links),
          topics_snapshot = COALESCE(topics_snapshot, topics)
      $backfill$;
    END IF;

    ALTER TABLE digest_items ALTER COLUMN summary_variant_id SET NOT NULL;
    ALTER TABLE digest_items ALTER COLUMN title_snapshot SET NOT NULL;
    ALTER TABLE digest_items ALTER COLUMN summary_snapshot SET NOT NULL;
  END IF;
END $$;

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

DO $$
BEGIN
  ALTER TABLE users DROP COLUMN IF EXISTS phone_number;
  ALTER TABLE users DROP COLUMN IF EXISTS timezone;
  ALTER TABLE users DROP COLUMN IF EXISTS send_hour;
  ALTER TABLE users DROP COLUMN IF EXISTS digest_max_items;

  ALTER TABLE story_clusters DROP COLUMN IF EXISTS article_ids;

  ALTER TABLE digests DROP COLUMN IF EXISTS sms_body;
  ALTER TABLE digests DROP COLUMN IF EXISTS sent_at;
  ALTER TABLE digests DROP COLUMN IF EXISTS recipient_phone;

  ALTER TABLE digest_items DROP COLUMN IF EXISTS title;
  ALTER TABLE digest_items DROP COLUMN IF EXISTS short_summary;
  ALTER TABLE digest_items DROP COLUMN IF EXISTS why_it_matters;
  ALTER TABLE digest_items DROP COLUMN IF EXISTS source_links;
  ALTER TABLE digest_items DROP COLUMN IF EXISTS topics;

  IF to_regclass('public.user_preferences') IS NOT NULL THEN
    DROP TABLE user_preferences;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_external_auth_idx
  ON users (external_auth_provider, external_auth_subject);
CREATE INDEX IF NOT EXISTS story_clusters_status_last_seen_idx
  ON story_clusters (status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS bucket_definitions_active_order_idx
  ON bucket_definitions (is_active, sort_order, name);
CREATE INDEX IF NOT EXISTS cluster_bucket_memberships_bucket_idx
  ON cluster_bucket_memberships (bucket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cluster_summaries_cluster_created_idx
  ON cluster_summaries (cluster_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cluster_summary_variants_cluster_type_idx
  ON cluster_summary_variants (cluster_id, variant_type, created_at DESC);
CREATE INDEX IF NOT EXISTS digests_user_created_at_idx
  ON digests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS digest_items_cluster_idx ON digest_items (cluster_id);
CREATE INDEX IF NOT EXISTS digest_items_variant_idx ON digest_items (summary_variant_id);
CREATE INDEX IF NOT EXISTS delivery_runs_digest_idx ON delivery_runs (digest_id);
CREATE INDEX IF NOT EXISTS delivery_runs_user_queued_idx ON delivery_runs (user_id, queued_at DESC);
CREATE INDEX IF NOT EXISTS feedback_events_user_created_at_idx
  ON feedback_events (user_id, created_at DESC);
