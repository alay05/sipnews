import { randomUUID } from "node:crypto";
import type { DatabaseClient, Queryable } from "./db.js";
import { withTransaction } from "./db.js";
import type {
  ArticleRecord,
  BucketDefinition,
  PreparedDigestCluster,
  ClusterBucketMembership,
  ClusterSummary,
  ClusterSummaryVariant,
  DataUser,
  DeliveryRun,
  DigestItemRecord,
  DigestRecord,
  IngestionRun,
  IngestionRunSource,
  SourceRecord,
  StoryClusterRecord,
  UserDigestSettings
} from "./types.js";

export interface UserRepository {
  upsertUser(user: DataUser): Promise<void>;
  findUserByAuth(
    provider: string,
    subject: string
  ): Promise<DataUser | undefined>;
  findUserByEmail(email: string): Promise<DataUser | undefined>;
  listActiveUsers(): Promise<DataUser[]>;
  getDigestSettings(userId: string): Promise<UserDigestSettings | undefined>;
  upsertDigestSettings(settings: UserDigestSettings): Promise<void>;
}

export interface ContentRepository {
  upsertSources(sources: SourceRecord[]): Promise<void>;
  upsertArticles(articles: ArticleRecord[]): Promise<void>;
  upsertStoryCluster(cluster: StoryClusterRecord): Promise<void>;
  upsertBucketDefinition(bucket: BucketDefinition): Promise<void>;
  listActiveBuckets(): Promise<BucketDefinition[]>;
  assignClusterToBucket(membership: ClusterBucketMembership): Promise<void>;
  saveClusterSummary(
    summary: ClusterSummary,
    variants: ClusterSummaryVariant[]
  ): Promise<void>;
  listPreparedClusters(): Promise<PreparedDigestCluster[]>;
  getLatestSummaryVariant(
    clusterId: string,
    variantType: string
  ): Promise<ClusterSummaryVariant | undefined>;
  listClusterIdsForBucket(bucketId: string): Promise<string[]>;
}

export interface DigestRepository {
  saveDigest(digest: DigestRecord): Promise<void>;
  getDigest(id: string): Promise<DigestRecord | undefined>;
  getDigestForUserDate(
    userId: string,
    localDate: string
  ): Promise<DigestRecord | undefined>;
}

export interface RunRepository {
  startIngestionRun(run: Pick<IngestionRun, "id"> & Partial<IngestionRun>): Promise<void>;
  startIngestionRunSource(
    sourceRun: Pick<IngestionRunSource, "runId" | "sourceId"> & Partial<IngestionRunSource>
  ): Promise<void>;
  finishIngestionRun(
    id: string,
    updates: Pick<
      Partial<IngestionRun>,
      "status" | "finishedAt" | "articlesSeen" | "articlesSaved" | "clustersTouched" | "errorMessage" | "metadata"
    >
  ): Promise<void>;
  finishIngestionRunSource(
    runId: string,
    sourceId: string,
    updates: Pick<
      Partial<IngestionRunSource>,
      "status" | "finishedAt" | "articlesSeen" | "articlesSaved" | "errorMessage"
    >
  ): Promise<void>;
  createDeliveryRun(run: DeliveryRun): Promise<void>;
  finishDeliveryRun(
    id: string,
    updates: Pick<
      Partial<DeliveryRun>,
      "status" | "providerMessageId" | "errorMessage" | "sentAt" | "finishedAt" | "metadata"
    >
  ): Promise<void>;
}

export interface DataRepositories {
  users: UserRepository;
  content: ContentRepository;
  digests: DigestRepository;
  runs: RunRepository;
}

export class PgUserRepository implements UserRepository {
  constructor(private readonly db: Queryable) {}

  async upsertUser(user: DataUser): Promise<void> {
    await this.db.query(
      `INSERT INTO users (
        id, external_auth_provider, external_auth_subject, email, display_name, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        external_auth_provider = EXCLUDED.external_auth_provider,
        external_auth_subject = EXCLUDED.external_auth_subject,
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        is_active = EXCLUDED.is_active,
        updated_at = now()`,
      [
        user.id,
        user.externalAuthProvider,
        user.externalAuthSubject,
        user.email ?? null,
        user.displayName ?? null,
        user.isActive
      ]
    );
  }

  async findUserByAuth(
    provider: string,
    subject: string
  ): Promise<DataUser | undefined> {
    const result = await this.db.query(
      `SELECT * FROM users
       WHERE external_auth_provider = $1 AND external_auth_subject = $2
       LIMIT 1`,
      [provider, subject]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : undefined;
  }

  async findUserByEmail(email: string): Promise<DataUser | undefined> {
    const result = await this.db.query(
      `SELECT * FROM users
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : undefined;
  }

  async listActiveUsers(): Promise<DataUser[]> {
    const result = await this.db.query(
      `SELECT * FROM users WHERE is_active = true ORDER BY created_at ASC`
    );
    return result.rows.map(mapUser);
  }

  async getDigestSettings(
    userId: string
  ): Promise<UserDigestSettings | undefined> {
    const result = await this.db.query(
      `SELECT * FROM user_digest_settings WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] ? mapDigestSettings(result.rows[0]) : undefined;
  }

  async upsertDigestSettings(settings: UserDigestSettings): Promise<void> {
    await this.db.query(
      `INSERT INTO user_digest_settings (
        user_id, timezone, send_hour, digest_max_items, summary_length, delivery_channel,
        delivery_address, category_counts, source_weights, muted_sources,
        preferred_bucket_ids, include_bucket_labels
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) DO UPDATE SET
        timezone = EXCLUDED.timezone,
        send_hour = EXCLUDED.send_hour,
        digest_max_items = EXCLUDED.digest_max_items,
        summary_length = EXCLUDED.summary_length,
        delivery_channel = EXCLUDED.delivery_channel,
        delivery_address = EXCLUDED.delivery_address,
        category_counts = EXCLUDED.category_counts,
        source_weights = EXCLUDED.source_weights,
        muted_sources = EXCLUDED.muted_sources,
        preferred_bucket_ids = EXCLUDED.preferred_bucket_ids,
        include_bucket_labels = EXCLUDED.include_bucket_labels,
        updated_at = now()`,
      [
        settings.userId,
        settings.timezone,
        settings.sendHour,
        settings.digestMaxItems,
        settings.summaryLength,
        settings.deliveryChannel,
        settings.deliveryAddress ?? null,
        JSON.stringify(settings.categoryCounts),
        JSON.stringify(settings.sourceWeights),
        settings.mutedSources,
        settings.preferredBucketIds,
        settings.includeBucketLabels
      ]
    );
  }
}

export class PgContentRepository implements ContentRepository {
  constructor(private readonly db: DatabaseClient) {}

  async upsertSources(sources: SourceRecord[]): Promise<void> {
    for (const source of sources) {
      await this.db.query(
        `INSERT INTO sources (id, name, type, url, enabled, priority, topics, config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           url = EXCLUDED.url,
           enabled = EXCLUDED.enabled,
           priority = EXCLUDED.priority,
           topics = EXCLUDED.topics,
           config = EXCLUDED.config,
           updated_at = now()`,
        [
          source.id,
          source.name,
          source.type,
          source.url ?? null,
          source.enabled,
          source.priority,
          source.topics,
          JSON.stringify(source.config ?? {})
        ]
      );
    }
  }

  async upsertArticles(articles: ArticleRecord[]): Promise<void> {
    for (const article of articles) {
      await this.db.query(
        `INSERT INTO articles (
          id, source_id, source_name, source_priority, canonical_url, title,
          excerpt, body, author, published_at, fetched_at, content_hash, topics, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (canonical_url, source_id) DO UPDATE SET
          source_name = EXCLUDED.source_name,
          source_priority = EXCLUDED.source_priority,
          title = EXCLUDED.title,
          excerpt = EXCLUDED.excerpt,
          body = EXCLUDED.body,
          author = EXCLUDED.author,
          published_at = EXCLUDED.published_at,
          fetched_at = EXCLUDED.fetched_at,
          content_hash = EXCLUDED.content_hash,
          topics = EXCLUDED.topics,
          metadata = EXCLUDED.metadata`,
        [
          article.id,
          article.sourceId,
          article.sourceName,
          article.sourcePriority,
          article.canonicalUrl,
          article.title,
          article.excerpt ?? null,
          article.body ?? null,
          article.author ?? null,
          article.publishedAt ?? null,
          article.fetchedAt,
          article.contentHash,
          article.topics,
          JSON.stringify(article.metadata ?? {})
        ]
      );
    }
  }

  async upsertStoryCluster(cluster: StoryClusterRecord): Promise<void> {
    await withTransaction(this.db, async (client) => {
      await client.query(
        `INSERT INTO story_clusters (
          id, representative_article_id, canonical_key, title, topics, score,
          status, first_seen_at, last_seen_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, now()), COALESCE($9, now()), $10)
        ON CONFLICT (id) DO UPDATE SET
          representative_article_id = EXCLUDED.representative_article_id,
          canonical_key = EXCLUDED.canonical_key,
          title = EXCLUDED.title,
          topics = EXCLUDED.topics,
          score = EXCLUDED.score,
          status = EXCLUDED.status,
          last_seen_at = EXCLUDED.last_seen_at,
          metadata = EXCLUDED.metadata,
          updated_at = now()`,
        [
          cluster.id,
          cluster.representativeArticleId ?? null,
          cluster.canonicalKey ?? null,
          cluster.title,
          cluster.topics,
          cluster.score,
          cluster.status,
          cluster.firstSeenAt ?? null,
          cluster.lastSeenAt ?? null,
          JSON.stringify(cluster.metadata ?? {})
        ]
      );

      for (const articleId of cluster.articleIds) {
        await client.query(
          `INSERT INTO story_cluster_articles (cluster_id, article_id, is_representative)
           VALUES ($1, $2, $3)
           ON CONFLICT (cluster_id, article_id) DO UPDATE SET
             is_representative = EXCLUDED.is_representative`,
          [cluster.id, articleId, articleId === cluster.representativeArticleId]
        );
      }
    });
  }

  async upsertBucketDefinition(bucket: BucketDefinition): Promise<void> {
    await this.db.query(
      `INSERT INTO bucket_definitions (
        id, name, description, sort_order, is_active, rules
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        rules = EXCLUDED.rules,
        updated_at = now()`,
      [
        bucket.id,
        bucket.name,
        bucket.description ?? null,
        bucket.sortOrder,
        bucket.isActive,
        JSON.stringify(bucket.rules)
      ]
    );
  }

  async listActiveBuckets(): Promise<BucketDefinition[]> {
    const result = await this.db.query(
      `SELECT * FROM bucket_definitions
       WHERE is_active = true
       ORDER BY sort_order ASC, name ASC`
    );
    return result.rows.map(mapBucket);
  }

  async assignClusterToBucket(
    membership: ClusterBucketMembership
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO cluster_bucket_memberships (
        cluster_id, bucket_id, confidence, rationale, assigned_by
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (cluster_id, bucket_id) DO UPDATE SET
        confidence = EXCLUDED.confidence,
        rationale = EXCLUDED.rationale,
        assigned_by = EXCLUDED.assigned_by`,
      [
        membership.clusterId,
        membership.bucketId,
        membership.confidence,
        membership.rationale ?? null,
        membership.assignedBy
      ]
    );
  }

  async saveClusterSummary(
    summary: ClusterSummary,
    variants: ClusterSummaryVariant[]
  ): Promise<void> {
    await withTransaction(this.db, async (client) => {
      await client.query(
        `INSERT INTO cluster_summaries (
          id, cluster_id, title, summary, why_it_matters, source_links,
          topics, model, prompt_version, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          source_links = EXCLUDED.source_links,
          topics = EXCLUDED.topics,
          model = EXCLUDED.model,
          prompt_version = EXCLUDED.prompt_version,
          metadata = EXCLUDED.metadata`,
        [
          summary.id,
          summary.clusterId,
          summary.title,
          summary.summary,
          summary.whyItMatters ?? null,
          JSON.stringify(summary.sourceLinks),
          summary.topics,
          summary.model ?? null,
          summary.promptVersion ?? null,
          JSON.stringify(summary.metadata ?? {})
        ]
      );

      for (const variant of variants) {
        await client.query(
          `INSERT INTO cluster_summary_variants (
            id, cluster_summary_id, cluster_id, variant_type, title, short_summary,
            why_it_matters, source_links, topics, model, prompt_version, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            variant_type = EXCLUDED.variant_type,
            title = EXCLUDED.title,
            short_summary = EXCLUDED.short_summary,
            why_it_matters = EXCLUDED.why_it_matters,
            source_links = EXCLUDED.source_links,
            topics = EXCLUDED.topics,
            model = EXCLUDED.model,
            prompt_version = EXCLUDED.prompt_version,
            metadata = EXCLUDED.metadata`,
          [
            variant.id,
            variant.clusterSummaryId,
            variant.clusterId,
            variant.variantType,
            variant.title,
            variant.shortSummary,
            variant.whyItMatters ?? null,
            JSON.stringify(variant.sourceLinks),
            variant.topics,
            variant.model ?? null,
            variant.promptVersion ?? null,
            JSON.stringify(variant.metadata ?? {})
          ]
        );
      }
    });
  }

  async listPreparedClusters(): Promise<PreparedDigestCluster[]> {
    const result = await this.db.query(
      `SELECT
         clusters.id AS cluster_id,
         buckets.bucket_id,
         clusters.title,
         clusters.topics,
         clusters.score,
         variants.id AS variant_id,
         variants.cluster_summary_id,
         variants.variant_type,
         variants.title AS variant_title,
         variants.short_summary,
         variants.why_it_matters,
         variants.source_links,
         variants.topics AS variant_topics,
         variants.model,
         variants.prompt_version,
         variants.metadata
       FROM story_clusters clusters
       JOIN cluster_bucket_memberships buckets
         ON buckets.cluster_id = clusters.id
       JOIN cluster_summary_variants variants
         ON variants.cluster_id = clusters.id
       WHERE clusters.status = 'active'
       ORDER BY clusters.score DESC, clusters.last_seen_at DESC, variants.created_at DESC`
    );

    const clusters = new Map<string, PreparedDigestCluster>();
    for (const row of result.rows) {
      const key = `${String(row.cluster_id)}:${String(row.bucket_id)}`;
      const existing =
        clusters.get(key) ??
        {
          clusterId: String(row.cluster_id),
          bucketId: String(row.bucket_id),
          title: String(row.title),
          topics: stringArray(row.topics),
          score: Number(row.score),
          variants: []
        };
      existing.variants.push({
        id: String(row.variant_id),
        clusterSummaryId: String(row.cluster_summary_id),
        clusterId: String(row.cluster_id),
        variantType: String(row.variant_type),
        title: String(row.variant_title),
        shortSummary: String(row.short_summary),
        whyItMatters: optionalString(row.why_it_matters),
        sourceLinks: linkArray(row.source_links),
        topics: stringArray(row.variant_topics),
        model: optionalString(row.model),
        promptVersion: optionalString(row.prompt_version),
        metadata: objectValue(row.metadata)
      });
      clusters.set(key, existing);
    }

    return [...clusters.values()];
  }

  async getLatestSummaryVariant(
    clusterId: string,
    variantType: string
  ): Promise<ClusterSummaryVariant | undefined> {
    const result = await this.db.query(
      `SELECT * FROM cluster_summary_variants
       WHERE cluster_id = $1 AND variant_type = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [clusterId, variantType]
    );
    return result.rows[0] ? mapSummaryVariant(result.rows[0]) : undefined;
  }

  async listClusterIdsForBucket(bucketId: string): Promise<string[]> {
    const result = await this.db.query(
      `SELECT cluster_id FROM cluster_bucket_memberships
       WHERE bucket_id = $1
       ORDER BY created_at DESC`,
      [bucketId]
    );
    return result.rows.map((row) => String(row.cluster_id));
  }
}

export class PgDigestRepository implements DigestRepository {
  constructor(private readonly db: DatabaseClient) {}

  async saveDigest(digest: DigestRecord): Promise<void> {
    await withTransaction(this.db, async (client) => {
      await client.query(
        `INSERT INTO digests (
          id, user_id, local_date, status, title, body_text, generated_at, delivered_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, local_date) DO UPDATE SET
          status = EXCLUDED.status,
          title = EXCLUDED.title,
          body_text = EXCLUDED.body_text,
          generated_at = EXCLUDED.generated_at,
          delivered_at = EXCLUDED.delivered_at,
          updated_at = now()`,
        [
          digest.id,
          digest.userId,
          digest.localDate,
          digest.status,
          digest.title ?? null,
          digest.bodyText ?? null,
          digest.generatedAt,
          digest.deliveredAt ?? null
        ]
      );

      await client.query(`DELETE FROM digest_items WHERE digest_id = $1`, [digest.id]);

      for (const item of digest.items) {
        await client.query(
          `INSERT INTO digest_items (
            id, digest_id, cluster_id, summary_variant_id, bucket_id, item_index,
            title_snapshot, summary_snapshot, why_it_matters_snapshot,
            source_links_snapshot, topics_snapshot
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            item.id || randomUUID(),
            digest.id,
            item.clusterId,
            item.summaryVariantId,
            item.bucketId ?? null,
            item.itemIndex,
            item.titleSnapshot,
            item.summarySnapshot,
            item.whyItMattersSnapshot ?? null,
            JSON.stringify(item.sourceLinksSnapshot),
            item.topicsSnapshot
          ]
        );
      }
    });
  }

  async getDigest(id: string): Promise<DigestRecord | undefined> {
    const result = await this.db.query(`SELECT * FROM digests WHERE id = $1`, [id]);
    return result.rows[0] ? this.hydrateDigest(result.rows[0]) : undefined;
  }

  async getDigestForUserDate(
    userId: string,
    localDate: string
  ): Promise<DigestRecord | undefined> {
    const result = await this.db.query(
      `SELECT * FROM digests WHERE user_id = $1 AND local_date = $2 LIMIT 1`,
      [userId, localDate]
    );
    return result.rows[0] ? this.hydrateDigest(result.rows[0]) : undefined;
  }

  private async hydrateDigest(row: Record<string, unknown>): Promise<DigestRecord> {
    const items = await this.db.query(
      `SELECT * FROM digest_items WHERE digest_id = $1 ORDER BY item_index ASC`,
      [row.id]
    );
    return {
      id: String(row.id),
      userId: String(row.user_id),
      localDate: formatPgDate(row.local_date),
      status: String(row.status),
      title: optionalString(row.title),
      bodyText: optionalString(row.body_text),
      generatedAt: toDate(row.generated_at),
      deliveredAt: optionalDate(row.delivered_at),
      items: items.rows.map(mapDigestItem)
    };
  }
}

export class PgRunRepository implements RunRepository {
  constructor(private readonly db: Queryable) {}

  async startIngestionRun(
    run: Pick<IngestionRun, "id"> & Partial<IngestionRun>
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO ingestion_runs (
        id, status, started_at, articles_seen, articles_saved,
        clusters_touched, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        articles_seen = EXCLUDED.articles_seen,
        articles_saved = EXCLUDED.articles_saved,
        clusters_touched = EXCLUDED.clusters_touched,
        error_message = EXCLUDED.error_message,
        metadata = EXCLUDED.metadata`,
      [
        run.id,
        run.status ?? "running",
        run.startedAt ?? new Date(),
        run.articlesSeen ?? 0,
        run.articlesSaved ?? 0,
        run.clustersTouched ?? 0,
        run.errorMessage ?? null,
        JSON.stringify(run.metadata ?? {})
      ]
    );
  }

  async finishIngestionRun(
    id: string,
    updates: Pick<
      Partial<IngestionRun>,
      "status" | "finishedAt" | "articlesSeen" | "articlesSaved" | "clustersTouched" | "errorMessage" | "metadata"
    >
  ): Promise<void> {
    await this.db.query(
      `UPDATE ingestion_runs SET
        status = COALESCE($2, status),
        finished_at = COALESCE($3, finished_at, now()),
        articles_seen = COALESCE($4, articles_seen),
        articles_saved = COALESCE($5, articles_saved),
        clusters_touched = COALESCE($6, clusters_touched),
        error_message = COALESCE($7, error_message),
        metadata = COALESCE($8, metadata)
       WHERE id = $1`,
      [
        id,
        updates.status ?? null,
        updates.finishedAt ?? null,
        updates.articlesSeen ?? null,
        updates.articlesSaved ?? null,
        updates.clustersTouched ?? null,
        updates.errorMessage ?? null,
        updates.metadata ? JSON.stringify(updates.metadata) : null
      ]
    );
  }

  async startIngestionRunSource(
    sourceRun: Pick<IngestionRunSource, "runId" | "sourceId"> & Partial<IngestionRunSource>
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO ingestion_run_sources (
        run_id, source_id, status, articles_seen, articles_saved,
        error_message, started_at, finished_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (run_id, source_id) DO UPDATE SET
        status = EXCLUDED.status,
        articles_seen = EXCLUDED.articles_seen,
        articles_saved = EXCLUDED.articles_saved,
        error_message = EXCLUDED.error_message,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at`,
      [
        sourceRun.runId,
        sourceRun.sourceId,
        sourceRun.status ?? "running",
        sourceRun.articlesSeen ?? 0,
        sourceRun.articlesSaved ?? 0,
        sourceRun.errorMessage ?? null,
        sourceRun.startedAt ?? new Date(),
        sourceRun.finishedAt ?? null
      ]
    );
  }

  async finishIngestionRunSource(
    runId: string,
    sourceId: string,
    updates: Pick<
      Partial<IngestionRunSource>,
      "status" | "finishedAt" | "articlesSeen" | "articlesSaved" | "errorMessage"
    >
  ): Promise<void> {
    await this.db.query(
      `UPDATE ingestion_run_sources SET
        status = COALESCE($3, status),
        finished_at = COALESCE($4, finished_at, now()),
        articles_seen = COALESCE($5, articles_seen),
        articles_saved = COALESCE($6, articles_saved),
        error_message = COALESCE($7, error_message)
       WHERE run_id = $1 AND source_id = $2`,
      [
        runId,
        sourceId,
        updates.status ?? null,
        updates.finishedAt ?? null,
        updates.articlesSeen ?? null,
        updates.articlesSaved ?? null,
        updates.errorMessage ?? null
      ]
    );
  }

  async createDeliveryRun(run: DeliveryRun): Promise<void> {
    await this.db.query(
      `INSERT INTO delivery_runs (
        id, user_id, digest_id, channel, status, destination, provider_message_id,
        error_message, queued_at, sent_at, finished_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        provider_message_id = EXCLUDED.provider_message_id,
        error_message = EXCLUDED.error_message,
        sent_at = EXCLUDED.sent_at,
        finished_at = EXCLUDED.finished_at,
        metadata = EXCLUDED.metadata`,
      [
        run.id,
        run.userId ?? null,
        run.digestId ?? null,
        run.channel,
        run.status,
        run.destination ?? null,
        run.providerMessageId ?? null,
        run.errorMessage ?? null,
        run.queuedAt,
        run.sentAt ?? null,
        run.finishedAt ?? null,
        JSON.stringify(run.metadata ?? {})
      ]
    );
  }

  async finishDeliveryRun(
    id: string,
    updates: Pick<
      Partial<DeliveryRun>,
      "status" | "providerMessageId" | "errorMessage" | "sentAt" | "finishedAt" | "metadata"
    >
  ): Promise<void> {
    await this.db.query(
      `UPDATE delivery_runs SET
        status = COALESCE($2, status),
        provider_message_id = COALESCE($3, provider_message_id),
        error_message = COALESCE($4, error_message),
        sent_at = COALESCE($5, sent_at),
        finished_at = COALESCE($6, finished_at, now()),
        metadata = COALESCE($7, metadata)
       WHERE id = $1`,
      [
        id,
        updates.status ?? null,
        updates.providerMessageId ?? null,
        updates.errorMessage ?? null,
        updates.sentAt ?? null,
        updates.finishedAt ?? null,
        updates.metadata ? JSON.stringify(updates.metadata) : null
      ]
    );
  }
}

export function createPgRepositories(db: DatabaseClient): DataRepositories {
  return {
    users: new PgUserRepository(db),
    content: new PgContentRepository(db),
    digests: new PgDigestRepository(db),
    runs: new PgRunRepository(db)
  };
}

export function formatPgDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  const datePrefix = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (datePrefix) return datePrefix[0];
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function mapUser(row: Record<string, unknown>): DataUser {
  return {
    id: String(row.id),
    externalAuthProvider: String(row.external_auth_provider),
    externalAuthSubject: String(row.external_auth_subject),
    email: optionalString(row.email),
    displayName: optionalString(row.display_name),
    isActive: Boolean(row.is_active),
    createdAt: optionalDate(row.created_at),
    updatedAt: optionalDate(row.updated_at)
  };
}

function mapDigestSettings(row: Record<string, unknown>): UserDigestSettings {
  return {
    userId: String(row.user_id),
    timezone: String(row.timezone),
    sendHour: Number(row.send_hour),
    digestMaxItems: Number(row.digest_max_items),
    summaryLength:
      row.summary_length === "small" || row.summary_length === "large"
        ? row.summary_length
        : "medium",
    deliveryChannel: String(row.delivery_channel),
    deliveryAddress: optionalString(row.delivery_address),
    categoryCounts: mapCategoryCounts(row.category_counts),
    sourceWeights: mapNumberRecord(row.source_weights),
    mutedSources: stringArray(row.muted_sources),
    preferredBucketIds: stringArray(row.preferred_bucket_ids),
    includeBucketLabels: Boolean(row.include_bucket_labels)
  };
}

function mapBucket(row: Record<string, unknown>): BucketDefinition {
  return {
    id: String(row.id),
    name: String(row.name),
    description: optionalString(row.description),
    sortOrder: Number(row.sort_order),
    isActive: Boolean(row.is_active),
    rules: objectValue(row.rules)
  };
}

function mapSummaryVariant(row: Record<string, unknown>): ClusterSummaryVariant {
  return {
    id: String(row.id),
    clusterSummaryId: String(row.cluster_summary_id),
    clusterId: String(row.cluster_id),
    variantType: String(row.variant_type),
    title: String(row.title),
    shortSummary: String(row.short_summary),
    whyItMatters: optionalString(row.why_it_matters),
    sourceLinks: linkArray(row.source_links),
    topics: stringArray(row.topics),
    model: optionalString(row.model),
    promptVersion: optionalString(row.prompt_version),
    metadata: objectValue(row.metadata)
  };
}

function mapDigestItem(row: Record<string, unknown>): DigestItemRecord {
  return {
    id: String(row.id),
    digestId: String(row.digest_id),
    clusterId: String(row.cluster_id),
    summaryVariantId: String(row.summary_variant_id),
    bucketId: optionalString(row.bucket_id),
    itemIndex: Number(row.item_index),
    titleSnapshot: String(row.title_snapshot),
    summarySnapshot: String(row.summary_snapshot),
    whyItMattersSnapshot: optionalString(row.why_it_matters_snapshot),
    sourceLinksSnapshot: linkArray(row.source_links_snapshot),
    topicsSnapshot: stringArray(row.topics_snapshot)
  };
}

function optionalString(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

function optionalDate(value: unknown): Date | undefined {
  return value === null || value === undefined ? undefined : toDate(value);
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") return JSON.parse(value) as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function mapNumberRecord(value: unknown): Record<string, number> {
  const object = objectValue(value);
  return Object.fromEntries(
    Object.entries(object).map(([key, recordValue]) => [key, Number(recordValue)])
  );
}

function mapCategoryCounts(value: unknown): UserDigestSettings["categoryCounts"] {
  const counts = mapNumberRecord(value);
  return {
    world: counts.world ?? 0,
    tech: counts.tech ?? 0,
    ai: counts.ai ?? 0,
    startups: counts.startups ?? 0
  };
}

function linkArray(value: unknown): Array<{ sourceName: string; url: string }> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) return [];
  return parsed.map((link) => ({
    sourceName: String((link as { sourceName?: unknown }).sourceName ?? ""),
    url: String((link as { url?: unknown }).url ?? "")
  }));
}
