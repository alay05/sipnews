import { randomUUID } from "node:crypto";
import {
  dedupeArticles,
  deriveBucketMembership,
  deriveBucketPools,
  filterRecentArticles,
  generateSummaryCacheKey,
  normalizeArticle,
  rankClusters,
  selectClustersForUserFromBuckets,
  type Article,
  type DigestCategory,
  type RawArticle,
  type SourceConfig,
  type StoryCluster,
  type UserPreferences
} from "@sms-news/core";
import type {
  ArticleRecord,
  BucketDefinition,
  ClusterSummary,
  ClusterSummaryVariant,
  DataRepositories,
  DataUser,
  DigestRecord,
  SourceRecord,
  StoryClusterRecord,
  UserDigestSettings
} from "@sms-news/data";
import { buildDigestEmail } from "./email.js";
import type {
  ClusterSummarizer,
  EmailClient,
  PreparedClusterSummary,
  SourceAdapter,
  SummaryVariantType,
  WorkerRunResult
} from "./types.js";

const DEFAULT_BUCKETS: Array<{
  id: DigestCategory;
  name: string;
  description: string;
  sortOrder: number;
}> = [
  {
    id: "general",
    name: "General",
    description: "General world and US news",
    sortOrder: 10
  },
  {
    id: "technology",
    name: "Technology",
    description: "Technology industry news",
    sortOrder: 20
  },
  {
    id: "ai_development",
    name: "AI Development",
    description: "AI, developer tools, and software news",
    sortOrder: 30
  },
  {
    id: "startups",
    name: "Startups",
    description: "Startup, venture, and funding news",
    sortOrder: 40
  }
];

const SUMMARY_VARIANTS: SummaryVariantType[] = ["short", "medium", "long"];

export interface BucketedWorkerPipelineOptions {
  repositories: DataRepositories;
  sources: SourceConfig[];
  adapterForSource: (source: SourceConfig) => SourceAdapter;
  summarizer: ClusterSummarizer;
  emailClient: EmailClient;
  emailFrom: string;
  publicBaseUrl: string;
  now?: Date;
  sourceFetchTimeoutMs?: number;
  maxArticleAgeDays?: number;
  summaryModel?: string;
  summaryPromptVersion?: string;
}

export class BucketedWorkerPipeline {
  constructor(private readonly options: BucketedWorkerPipelineOptions) {}

  async run(): Promise<WorkerRunResult> {
    const now = this.options.now ?? new Date();
    const ingestionRunId = randomUUID();
    await this.options.repositories.runs.startIngestionRun({
      id: ingestionRunId,
      status: "running",
      startedAt: now,
      metadata: { sourceCount: this.options.sources.length }
    });

    try {
      await this.saveSources();
      const rawArticles = await this.fetchAllSources();
      const articles = this.normalizeArticles(rawArticles, now);
      await this.options.repositories.content.upsertArticles(articles.map(articleRecord));

      const clusters = rankClusters(dedupeArticles(articles), emptyPreferences(), now);
      await this.persistClustersAndBuckets(clusters, now);
      const summaries = await this.prepareSummaries(clusters);
      const dueUsers = await this.findUsersDueForDelivery(now);
      const digests: DigestRecord[] = [];

      const pools = deriveBucketPools(clusters);
      for (const { user, settings, localDate } of dueUsers) {
        const existing = await this.options.repositories.digests.getDigestForUserDate(
          user.id,
          localDate
        );
        if (existing?.status === "delivered") continue;

        const selected = selectClustersForUserFromBuckets(
          pools,
          userPreferences(settings),
          {
            totalItemCount: settings.digestMaxItems,
            now,
            date: now
          }
        );
        const digest = existing ?? this.assembleDigest(user, settings, localDate, now, selected, summaries);
        if (!existing) {
          await this.options.repositories.digests.saveDigest(digest);
        }

        await this.deliverDigest(digest, user, settings, now);
        digests.push({ ...digest, status: "delivered", deliveredAt: now });
      }

      await this.options.repositories.runs.finishIngestionRun(ingestionRunId, {
        status: "succeeded",
        finishedAt: now,
        articlesSeen: rawArticles.length,
        articlesSaved: articles.length,
        clustersTouched: clusters.length,
        metadata: { dueUsers: dueUsers.length, digests: digests.length }
      });

      return {
        ingestionRunId,
        articlesSeen: rawArticles.length,
        articlesSaved: articles.length,
        clustersTouched: clusters.length,
        dueUsers: dueUsers.length,
        digests
      };
    } catch (error) {
      await this.options.repositories.runs.finishIngestionRun(ingestionRunId, {
        status: "failed",
        finishedAt: now,
        articlesSeen: 0,
        articlesSaved: 0,
        clustersTouched: 0,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async saveSources(): Promise<void> {
    await this.options.repositories.content.upsertSources(
      this.options.sources.map(sourceRecord)
    );
  }

  private async fetchAllSources(): Promise<RawArticle[]> {
    const results = await Promise.all(
      this.options.sources.map(async (source) => {
        try {
          return await withTimeout(
            this.options.adapterForSource(source).fetch(source),
            this.options.sourceFetchTimeoutMs ?? 15000,
            `Source ${source.name} (${source.id}) timed out`
          );
        } catch (error) {
          console.warn(
            `[sources] ${source.name} (${source.id}) failed; continuing without it.`,
            error
          );
          return [];
        }
      })
    );
    return results.flat();
  }

  private normalizeArticles(rawArticles: RawArticle[], now: Date): Article[] {
    return filterRecentArticles(rawArticles.map(normalizeArticle), {
      now,
      maxAgeDays: this.options.maxArticleAgeDays ?? 7
    });
  }

  private async persistClustersAndBuckets(
    clusters: StoryCluster[],
    now: Date
  ): Promise<void> {
    for (const bucket of DEFAULT_BUCKETS) {
      await this.options.repositories.content.upsertBucketDefinition(bucketDefinition(bucket));
    }

    for (const cluster of clusters) {
      await this.options.repositories.content.upsertStoryCluster(clusterRecord(cluster, now));
      const membership = deriveBucketMembership(cluster);
      await this.options.repositories.content.assignClusterToBucket({
        clusterId: membership.clusterId,
        bucketId: membership.bucket,
        confidence: 1,
        rationale: `Derived from topics: ${membership.topics.join(", ")}`,
        assignedBy: "worker"
      });
    }
  }

  private async prepareSummaries(
    clusters: StoryCluster[]
  ): Promise<Map<string, PreparedClusterSummary>> {
    const prepared = new Map<string, PreparedClusterSummary>();

    for (const cluster of clusters) {
      const existing = await this.getExistingVariants(cluster.id);
      const missing = SUMMARY_VARIANTS.filter((variant) => !existing[variant]);
      if (missing.length === 0) {
        prepared.set(cluster.id, {
          summary: summaryFromVariant(existing.long ?? existing.medium ?? existing.short),
          variants: existing as Record<SummaryVariantType, ClusterSummaryVariant>
        });
        continue;
      }

      const draft = await this.options.summarizer.summarize(cluster);
      const summaryId =
        existing.short?.clusterSummaryId ??
        existing.medium?.clusterSummaryId ??
        existing.long?.clusterSummaryId ??
        summaryIdForCluster(cluster.id, this.summaryModel(), this.summaryPromptVersion());
      const summary: ClusterSummary = {
        id: summaryId,
        clusterId: cluster.id,
        title: draft.title,
        summary: draft.summary,
        whyItMatters: draft.whyItMatters,
        sourceLinks: draft.sourceLinks,
        topics: draft.topics,
        model: this.summaryModel(),
        promptVersion: this.summaryPromptVersion(),
        metadata: { generatedBy: "worker" }
      };
      const generated = Object.fromEntries(
        SUMMARY_VARIANTS.map((variantType) => [
          variantType,
          existing[variantType] ??
            summaryVariant(summary, variantType, variantText(draft.summary, variantType))
        ])
      ) as Record<SummaryVariantType, ClusterSummaryVariant>;

      await this.options.repositories.content.saveClusterSummary(
        summary,
        missing.map((variantType) => generated[variantType])
      );
      prepared.set(cluster.id, { summary, variants: generated });
    }

    return prepared;
  }

  private async getExistingVariants(
    clusterId: string
  ): Promise<Partial<Record<SummaryVariantType, ClusterSummaryVariant>>> {
    const pairs = await Promise.all(
      SUMMARY_VARIANTS.map(async (variant) => [
        variant,
        await this.options.repositories.content.getLatestSummaryVariant(clusterId, variant)
      ] as const)
    );
    return Object.fromEntries(pairs.filter((pair) => pair[1])) as Partial<
      Record<SummaryVariantType, ClusterSummaryVariant>
    >;
  }

  private async findUsersDueForDelivery(
    now: Date
  ): Promise<Array<{ user: DataUser; settings: UserDigestSettings; localDate: string }>> {
    const users = await this.options.repositories.users.listActiveUsers();
    const due: Array<{ user: DataUser; settings: UserDigestSettings; localDate: string }> = [];

    for (const user of users) {
      const settings = await this.options.repositories.users.getDigestSettings(user.id);
      if (!settings || settings.deliveryChannel !== "email") continue;
      if (!deliveryAddress(user, settings)) continue;
      if (getLocalHour(now, settings.timezone) !== settings.sendHour) continue;

      due.push({
        user,
        settings,
        localDate: getLocalDate(now, settings.timezone)
      });
    }

    return due;
  }

  private assembleDigest(
    user: DataUser,
    settings: UserDigestSettings,
    localDate: string,
    now: Date,
    selected: StoryCluster[],
    summaries: Map<string, PreparedClusterSummary>
  ): DigestRecord {
    const digestId = randomUUID();
    const variantType = preferredVariantType(settings);
    const items = selected.flatMap((cluster, index) => {
      const prepared = summaries.get(cluster.id);
      if (!prepared) return [];
      const variant = prepared.variants[variantType];
      const membership = deriveBucketMembership(cluster);
      return [
        {
          id: randomUUID(),
          digestId,
          clusterId: cluster.id,
          summaryVariantId: variant.id,
          bucketId: membership.bucket,
          itemIndex: index,
          titleSnapshot: variant.title,
          summarySnapshot: variant.shortSummary,
          whyItMattersSnapshot: variant.whyItMatters,
          sourceLinksSnapshot: variant.sourceLinks,
          topicsSnapshot: variant.topics
        }
      ];
    });

    return {
      id: digestId,
      userId: user.id,
      localDate,
      status: "draft",
      title: `Daily news digest - ${localDate}`,
      bodyText: items.map((item) => item.summarySnapshot).join("\n\n"),
      generatedAt: now,
      items
    };
  }

  private async deliverDigest(
    digest: DigestRecord,
    user: DataUser,
    settings: UserDigestSettings,
    now: Date
  ): Promise<void> {
    const destination = deliveryAddress(user, settings);
    if (!destination) return;

    const deliveryRunId = randomUUID();
    await this.options.repositories.runs.createDeliveryRun({
      id: deliveryRunId,
      userId: user.id,
      digestId: digest.id,
      channel: "email",
      status: "running",
      destination,
      queuedAt: now,
      metadata: { itemCount: digest.items.length }
    });

    try {
      const result = await this.options.emailClient.sendEmail({
        to: destination,
        from: this.options.emailFrom,
        ...buildDigestEmail(digest, this.options.publicBaseUrl)
      });
      const delivered: DigestRecord = {
        ...digest,
        status: "delivered",
        deliveredAt: now
      };
      await this.options.repositories.digests.saveDigest(delivered);
      await this.options.repositories.runs.finishDeliveryRun(deliveryRunId, {
        status: "succeeded",
        providerMessageId: result?.providerMessageId,
        sentAt: now,
        finishedAt: now
      });
    } catch (error) {
      await this.options.repositories.runs.finishDeliveryRun(deliveryRunId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        finishedAt: now
      });
      throw error;
    }
  }

  private summaryModel(): string {
    return this.options.summaryModel ?? "heuristic";
  }

  private summaryPromptVersion(): string {
    return this.options.summaryPromptVersion ?? "worker-v1";
  }
}

export function getLocalDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error(`Unable to derive local date for timezone ${timezone}`);
  }

  return `${year}-${month}-${day}`;
}

export function getLocalHour(date: Date, timezone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false
  }).formatToParts(date).find((part) => part.type === "hour")?.value;
  if (!hour) throw new Error(`Unable to derive local hour for timezone ${timezone}`);
  return Number.parseInt(hour === "24" ? "0" : hour, 10);
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function sourceRecord(source: SourceConfig): SourceRecord {
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    enabled: source.enabled,
    priority: source.priority,
    url: source.url,
    topics: source.topics,
    config: source.config
  };
}

function articleRecord(article: Article): ArticleRecord {
  return {
    ...article,
    sourceId: article.sourceId,
    sourceName: article.sourceName,
    sourcePriority: article.sourcePriority,
    metadata: {}
  };
}

function clusterRecord(cluster: StoryCluster, now: Date): StoryClusterRecord {
  return {
    id: cluster.id,
    representativeArticleId: cluster.representative.id,
    canonicalKey: cluster.id,
    title: cluster.representative.title,
    topics: cluster.topics,
    score: cluster.score,
    status: "active",
    firstSeenAt: now,
    lastSeenAt: now,
    articleIds: cluster.articles.map((article) => article.id),
    metadata: { articleCount: cluster.articles.length }
  };
}

function bucketDefinition(bucket: (typeof DEFAULT_BUCKETS)[number]): BucketDefinition {
  return {
    id: bucket.id,
    name: bucket.name,
    description: bucket.description,
    sortOrder: bucket.sortOrder,
    isActive: true,
    rules: { category: bucket.id }
  };
}

function summaryIdForCluster(clusterId: string, model: string, promptVersion: string): string {
  return `canonical_${generateSummaryCacheKey({
    clusterId,
    length: "long",
    model,
    promptVersion
  }).slice("summary_".length)}`;
}

function summaryVariant(
  summary: ClusterSummary,
  variantType: SummaryVariantType,
  shortSummary: string
): ClusterSummaryVariant {
  return {
    id: generateSummaryCacheKey({
      clusterId: summary.clusterId,
      length: variantType,
      model: summary.model ?? "heuristic",
      promptVersion: summary.promptVersion ?? "worker-v1"
    }),
    clusterSummaryId: summary.id,
    clusterId: summary.clusterId,
    variantType,
    title: summary.title,
    shortSummary,
    whyItMatters: summary.whyItMatters,
    sourceLinks: summary.sourceLinks,
    topics: summary.topics,
    model: summary.model,
    promptVersion: summary.promptVersion,
    metadata: { generatedBy: "worker" }
  };
}

function variantText(summary: string, variantType: SummaryVariantType): string {
  const limits: Record<SummaryVariantType, number> = {
    short: 220,
    medium: 600,
    long: 1200
  };
  return truncate(summary, limits[variantType]);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength - 1).trimEnd();
  return `${trimmed}.`;
}

function summaryFromVariant(variant: ClusterSummaryVariant | undefined): ClusterSummary {
  if (!variant) throw new Error("Cannot build summary from missing variant");
  return {
    id: variant.clusterSummaryId,
    clusterId: variant.clusterId,
    title: variant.title,
    summary: variant.shortSummary,
    whyItMatters: variant.whyItMatters,
    sourceLinks: variant.sourceLinks,
    topics: variant.topics,
    model: variant.model,
    promptVersion: variant.promptVersion,
    metadata: variant.metadata
  };
}

function emptyPreferences(): UserPreferences {
  return {
    topicWeights: {},
    sourceWeights: {},
    mutedSources: []
  };
}

function userPreferences(settings: UserDigestSettings): UserPreferences {
  return {
    topicWeights: settings.topicWeights,
    sourceWeights: settings.sourceWeights,
    mutedSources: settings.mutedSources
  };
}

function deliveryAddress(user: DataUser, settings: UserDigestSettings): string | undefined {
  return settings.deliveryAddress ?? user.email;
}

function preferredVariantType(_settings: UserDigestSettings): SummaryVariantType {
  return "medium";
}
