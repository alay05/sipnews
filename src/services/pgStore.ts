import { randomUUID } from "node:crypto";
import { Pool, type PoolClient, type PoolConfig } from "pg";
import type {
  AppUser,
  Article,
  Digest,
  DigestItem,
  SourceConfig,
  StoryCluster,
  UserPreferences
} from "../types/articles.js";
import type { FeedbackCommand } from "../core/feedback.js";
import { feedbackContextForCommand } from "./feedbackService.js";
import {
  clonePreferences,
  emptyPreferences,
  feedbackEventId,
  type AppStore,
  type FeedbackContext
} from "./store.js";

export class PgStore implements AppStore {
  private readonly pool: Pool;

  constructor(config: PoolConfig | string) {
    this.pool =
      typeof config === "string"
        ? new Pool({ connectionString: config })
        : new Pool(config);
  }

  async ensureUser(user: AppUser): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (
        id, phone_number, display_name, timezone, send_hour, digest_max_items, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
        display_name = EXCLUDED.display_name,
        timezone = EXCLUDED.timezone,
        send_hour = EXCLUDED.send_hour,
        digest_max_items = EXCLUDED.digest_max_items,
        is_active = EXCLUDED.is_active,
        updated_at = now()`,
      [
        user.id,
        user.phoneNumber,
        user.displayName ?? null,
        user.timezone,
        user.sendHour,
        user.digestMaxItems,
        user.isActive
      ]
    );

    await this.pool.query(
      `INSERT INTO user_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );
  }

  async getActiveUsers(): Promise<AppUser[]> {
    const result = await this.pool.query(
      `SELECT * FROM users WHERE is_active = true ORDER BY created_at ASC`
    );
    return result.rows.map(mapUserRow);
  }

  async getUserByPhone(phoneNumber: string): Promise<AppUser | undefined> {
    const result = await this.pool.query(
      `SELECT * FROM users WHERE phone_number = $1 LIMIT 1`,
      [phoneNumber]
    );
    return result.rows[0] ? mapUserRow(result.rows[0]) : undefined;
  }

  async updateUserActive(userId: string, isActive: boolean): Promise<void> {
    await this.pool.query(
      `UPDATE users SET is_active = $2, updated_at = now() WHERE id = $1`,
      [userId, isActive]
    );
  }

  async saveSources(sources: SourceConfig[]): Promise<void> {
    for (const source of sources) {
      await this.pool.query(
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

  async saveArticles(articles: Article[]): Promise<void> {
    for (const article of articles) {
      await this.pool.query(
        `INSERT INTO articles (
          id, source_id, source_name, canonical_url, title, excerpt, body, author,
          published_at, fetched_at, content_hash, topics
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (canonical_url, source_id) DO UPDATE SET
          source_name = EXCLUDED.source_name,
          title = EXCLUDED.title,
          excerpt = EXCLUDED.excerpt,
          body = EXCLUDED.body,
          author = EXCLUDED.author,
          published_at = EXCLUDED.published_at,
          fetched_at = EXCLUDED.fetched_at,
          content_hash = EXCLUDED.content_hash,
          topics = EXCLUDED.topics`,
        [
          article.id,
          article.sourceId,
          article.sourceName,
          article.canonicalUrl,
          article.title,
          article.excerpt ?? null,
          article.body ?? null,
          article.author ?? null,
          article.publishedAt ?? null,
          article.fetchedAt,
          article.contentHash,
          article.topics
        ]
      );
    }
  }

  async saveClusters(clusters: StoryCluster[]): Promise<void> {
    for (const cluster of clusters) {
      await this.pool.query(
        `INSERT INTO story_clusters (
          id, representative_article_id, title, topics, article_ids, score
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          representative_article_id = EXCLUDED.representative_article_id,
          title = EXCLUDED.title,
          topics = EXCLUDED.topics,
          article_ids = EXCLUDED.article_ids,
          score = EXCLUDED.score`,
        [
          cluster.id,
          cluster.representative.id,
          cluster.representative.title,
          cluster.topics,
          cluster.articles.map((article) => article.id),
          cluster.score
        ]
      );
    }
  }

  async saveDigest(digest: Digest): Promise<void> {
    await withTransaction(this.pool, async (client) => {
      await client.query(
        `INSERT INTO digests (
          id, user_id, local_date, sms_body, created_at, sent_at, recipient_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, local_date) DO UPDATE SET
          sms_body = EXCLUDED.sms_body,
          sent_at = EXCLUDED.sent_at,
          recipient_phone = EXCLUDED.recipient_phone`,
        [
          digest.id,
          digest.userId,
          digest.localDate,
          digest.smsBody,
          digest.createdAt,
          digest.sentAt ?? null,
          digest.recipientPhone ?? null
        ]
      );

      await client.query(`DELETE FROM digest_items WHERE digest_id = $1`, [digest.id]);

      for (const item of digest.items) {
        await client.query(
          `INSERT INTO digest_items (
            id, digest_id, cluster_id, item_index, title, short_summary,
            why_it_matters, source_links, topics
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            randomUUID(),
            digest.id,
            item.clusterId,
            item.index,
            item.title,
            item.shortSummary,
            item.whyItMatters ?? null,
            JSON.stringify(item.sourceLinks),
            item.topics
          ]
        );
      }
    });
  }

  async getDigest(id: string): Promise<Digest | undefined> {
    const result = await this.pool.query(`SELECT * FROM digests WHERE id = $1`, [id]);
    if (!result.rows[0]) return undefined;
    return this.hydrateDigest(result.rows[0]);
  }

  async getDigestForUserDate(
    userId: string,
    localDate: string
  ): Promise<Digest | undefined> {
    const result = await this.pool.query(
      `SELECT * FROM digests WHERE user_id = $1 AND local_date = $2 LIMIT 1`,
      [userId, localDate]
    );
    if (!result.rows[0]) return undefined;
    return this.hydrateDigest(result.rows[0]);
  }

  async getLatestDigestForUser(userId: string): Promise<Digest | undefined> {
    const result = await this.pool.query(
      `SELECT * FROM digests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (!result.rows[0]) return undefined;
    return this.hydrateDigest(result.rows[0]);
  }

  async getDigestItem(
    digestId: string,
    itemIndex: number
  ): Promise<DigestItem | undefined> {
    const result = await this.pool.query(
      `SELECT * FROM digest_items WHERE digest_id = $1 AND item_index = $2 LIMIT 1`,
      [digestId, itemIndex]
    );
    return result.rows[0] ? mapDigestItemRow(result.rows[0]) : undefined;
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const result = await this.pool.query(
      `SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!result.rows[0]) return emptyPreferences();

    return {
      topicWeights: result.rows[0].topic_weights ?? {},
      sourceWeights: result.rows[0].source_weights ?? {},
      mutedSources: result.rows[0].muted_sources ?? []
    };
  }

  async savePreferences(
    userId: string,
    preferences: UserPreferences
  ): Promise<void> {
    const cloned = clonePreferences(preferences);
    await this.pool.query(
      `INSERT INTO user_preferences (
        user_id, topic_weights, source_weights, muted_sources, updated_at
      ) VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (user_id) DO UPDATE SET
        topic_weights = EXCLUDED.topic_weights,
        source_weights = EXCLUDED.source_weights,
        muted_sources = EXCLUDED.muted_sources,
        updated_at = now()`,
      [
        userId,
        JSON.stringify(cloned.topicWeights),
        JSON.stringify(cloned.sourceWeights),
        cloned.mutedSources
      ]
    );
  }

  async saveFeedback(
    userId: string,
    command: FeedbackCommand,
    context?: FeedbackContext
  ): Promise<void> {
    const feedback = feedbackContextForCommand(command, context);
    await this.pool.query(
      `INSERT INTO feedback_events (
        id, user_id, digest_id, item_index, command, sentiment, topic,
        source_name, raw_body
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        feedbackEventId(),
        userId,
        feedback.digestId ?? null,
        feedback.itemIndex ?? null,
        command.type,
        feedback.sentiment ?? null,
        feedback.topic ?? null,
        feedback.sourceName ?? null,
        feedback.rawBody ?? command.raw
      ]
    );
  }

  private async hydrateDigest(row: Record<string, unknown>): Promise<Digest> {
    const items = await this.pool.query(
      `SELECT * FROM digest_items WHERE digest_id = $1 ORDER BY item_index ASC`,
      [row.id]
    );

    return {
      id: String(row.id),
      userId: String(row.user_id),
      localDate: formatPgDate(row.local_date),
      createdAt: new Date(String(row.created_at)),
      sentAt: row.sent_at ? new Date(String(row.sent_at)) : undefined,
      recipientPhone: row.recipient_phone ? String(row.recipient_phone) : undefined,
      smsBody: String(row.sms_body),
      items: items.rows.map(mapDigestItemRow)
    };
  }
}

export function formatPgDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  const datePrefix = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (datePrefix) return datePrefix[0];
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function mapUserRow(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    phoneNumber: String(row.phone_number),
    displayName: row.display_name ? String(row.display_name) : undefined,
    timezone: String(row.timezone),
    sendHour: Number(row.send_hour),
    digestMaxItems: Number(row.digest_max_items),
    isActive: Boolean(row.is_active)
  };
}

function mapDigestItemRow(row: Record<string, unknown>): DigestItem {
  return {
    index: Number(row.item_index),
    clusterId: String(row.cluster_id),
    title: String(row.title),
    shortSummary: String(row.short_summary),
    whyItMatters: row.why_it_matters ? String(row.why_it_matters) : undefined,
    sourceLinks: Array.isArray(row.source_links)
      ? row.source_links
      : JSON.parse(String(row.source_links ?? "[]")),
    topics: Array.isArray(row.topics) ? row.topics.map(String) : []
  };
}

async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
