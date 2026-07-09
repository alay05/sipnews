import type {
  ContentRepository,
  DataRepositories,
  DigestRepository,
  RunRepository,
  UserRepository
} from "./repositories.js";
import type {
  BucketDefinition,
  ClusterBucketMembership,
  ClusterSummary,
  ClusterSummaryVariant,
  DataUser,
  DeliveryRun,
  DigestRecord,
  IngestionRun,
  IngestionRunSource,
  PreparedDigestCluster,
  SourceRecord,
  ArticleRecord,
  StoryClusterRecord,
  UserDigestSettings
} from "./types.js";

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, DataUser>();
  private readonly settings = new Map<string, UserDigestSettings>();

  async upsertUser(user: DataUser): Promise<void> {
    this.users.set(user.id, { ...user });
  }

  async findUserByAuth(
    provider: string,
    subject: string
  ): Promise<DataUser | undefined> {
    return [...this.users.values()].find(
      (user) =>
        user.externalAuthProvider === provider &&
        user.externalAuthSubject === subject
    );
  }

  async findUserByEmail(email: string): Promise<DataUser | undefined> {
    return [...this.users.values()].find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
  }

  async listActiveUsers(): Promise<DataUser[]> {
    return [...this.users.values()].filter((user) => user.isActive);
  }

  async getDigestSettings(
    userId: string
  ): Promise<UserDigestSettings | undefined> {
    const settings = this.settings.get(userId);
    return settings ? cloneSettings(settings) : undefined;
  }

  async upsertDigestSettings(settings: UserDigestSettings): Promise<void> {
    this.settings.set(settings.userId, cloneSettings(settings));
  }
}

export class InMemoryContentRepository implements ContentRepository {
  readonly sources = new Map<string, SourceRecord>();
  readonly articles = new Map<string, ArticleRecord>();
  readonly clusters = new Map<string, StoryClusterRecord>();
  readonly buckets = new Map<string, BucketDefinition>();
  readonly memberships = new Map<string, ClusterBucketMembership>();
  readonly summaries = new Map<string, ClusterSummary>();
  readonly variants = new Map<string, ClusterSummaryVariant>();

  async upsertSources(sources: SourceRecord[]): Promise<void> {
    for (const source of sources) this.sources.set(source.id, { ...source });
  }

  async upsertArticles(articles: ArticleRecord[]): Promise<void> {
    for (const article of articles) this.articles.set(article.id, { ...article });
  }

  async upsertStoryCluster(cluster: StoryClusterRecord): Promise<void> {
    this.clusters.set(cluster.id, { ...cluster, articleIds: [...cluster.articleIds] });
  }

  async upsertBucketDefinition(bucket: BucketDefinition): Promise<void> {
    this.buckets.set(bucket.id, { ...bucket, rules: { ...bucket.rules } });
  }

  async listActiveBuckets(): Promise<BucketDefinition[]> {
    return [...this.buckets.values()]
      .filter((bucket) => bucket.isActive)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  }

  async assignClusterToBucket(
    membership: ClusterBucketMembership
  ): Promise<void> {
    this.memberships.set(
      `${membership.clusterId}:${membership.bucketId}`,
      { ...membership }
    );
  }

  async saveClusterSummary(
    summary: ClusterSummary,
    variants: ClusterSummaryVariant[]
  ): Promise<void> {
    this.summaries.set(summary.id, { ...summary });
    for (const variant of variants) this.variants.set(variant.id, { ...variant });
  }

  async listPreparedClusters(): Promise<PreparedDigestCluster[]> {
    return [...this.memberships.values()]
      .map((membership) => {
        const cluster = this.clusters.get(membership.clusterId);
        if (!cluster) return undefined;
        const variants = [...this.variants.values()].filter(
          (variant) => variant.clusterId === membership.clusterId
        );
        return {
          clusterId: membership.clusterId,
          bucketId: membership.bucketId,
          title: cluster.title,
          topics: [...cluster.topics],
          score: cluster.score,
          variants: variants.map((variant) => ({ ...variant }))
        };
      })
      .filter((value): value is PreparedDigestCluster => Boolean(value))
      .sort((left, right) => right.score - left.score);
  }

  async getLatestSummaryVariant(
    clusterId: string,
    variantType: string
  ): Promise<ClusterSummaryVariant | undefined> {
    return [...this.variants.values()]
      .filter(
        (variant) =>
          variant.clusterId === clusterId && variant.variantType === variantType
      )
      .at(-1);
  }

  async listClusterIdsForBucket(bucketId: string): Promise<string[]> {
    return [...this.memberships.values()]
      .filter((membership) => membership.bucketId === bucketId)
      .map((membership) => membership.clusterId);
  }
}

export class InMemoryDigestRepository implements DigestRepository {
  private readonly digests = new Map<string, DigestRecord>();

  async saveDigest(digest: DigestRecord): Promise<void> {
    this.digests.set(digest.id, cloneDigest(digest));
  }

  async getDigest(id: string): Promise<DigestRecord | undefined> {
    const digest = this.digests.get(id);
    return digest ? cloneDigest(digest) : undefined;
  }

  async getDigestForUserDate(
    userId: string,
    localDate: string
  ): Promise<DigestRecord | undefined> {
    const digest = [...this.digests.values()].find(
      (candidate) =>
        candidate.userId === userId && candidate.localDate === localDate
    );
    return digest ? cloneDigest(digest) : undefined;
  }
}

export class InMemoryRunRepository implements RunRepository {
  readonly ingestionRuns = new Map<string, IngestionRun>();
  readonly ingestionRunSources = new Map<string, IngestionRunSource>();
  readonly deliveryRuns = new Map<string, DeliveryRun>();

  async startIngestionRun(
    run: Pick<IngestionRun, "id"> & Partial<IngestionRun>
  ): Promise<void> {
    this.ingestionRuns.set(run.id, {
      id: run.id,
      status: run.status ?? "running",
      startedAt: run.startedAt ?? new Date(),
      finishedAt: run.finishedAt,
      articlesSeen: run.articlesSeen ?? 0,
      articlesSaved: run.articlesSaved ?? 0,
      clustersTouched: run.clustersTouched ?? 0,
      errorMessage: run.errorMessage,
      metadata: run.metadata ?? {}
    });
  }

  async finishIngestionRun(
    id: string,
    updates: Partial<IngestionRun>
  ): Promise<void> {
    const existing = this.ingestionRuns.get(id);
    if (!existing) return;
    this.ingestionRuns.set(id, {
      ...existing,
      ...updates,
      finishedAt: updates.finishedAt ?? existing.finishedAt ?? new Date()
    });
  }

  async startIngestionRunSource(
    sourceRun: Pick<IngestionRunSource, "runId" | "sourceId"> & Partial<IngestionRunSource>
  ): Promise<void> {
    this.ingestionRunSources.set(sourceRunKey(sourceRun.runId, sourceRun.sourceId), {
      runId: sourceRun.runId,
      sourceId: sourceRun.sourceId,
      status: sourceRun.status ?? "running",
      startedAt: sourceRun.startedAt ?? new Date(),
      finishedAt: sourceRun.finishedAt,
      articlesSeen: sourceRun.articlesSeen ?? 0,
      articlesSaved: sourceRun.articlesSaved ?? 0,
      errorMessage: sourceRun.errorMessage
    });
  }

  async finishIngestionRunSource(
    runId: string,
    sourceId: string,
    updates: Partial<IngestionRunSource>
  ): Promise<void> {
    const key = sourceRunKey(runId, sourceId);
    const existing = this.ingestionRunSources.get(key);
    if (!existing) return;
    this.ingestionRunSources.set(key, {
      ...existing,
      ...updates,
      finishedAt: updates.finishedAt ?? existing.finishedAt ?? new Date()
    });
  }

  async createDeliveryRun(run: DeliveryRun): Promise<void> {
    this.deliveryRuns.set(run.id, { ...run, metadata: run.metadata ?? {} });
  }

  async finishDeliveryRun(id: string, updates: Partial<DeliveryRun>): Promise<void> {
    const existing = this.deliveryRuns.get(id);
    if (!existing) return;
    this.deliveryRuns.set(id, {
      ...existing,
      ...updates,
      finishedAt: updates.finishedAt ?? existing.finishedAt ?? new Date()
    });
  }
}

export function createInMemoryRepositories(): DataRepositories {
  return {
    users: new InMemoryUserRepository(),
    content: new InMemoryContentRepository(),
    digests: new InMemoryDigestRepository(),
    runs: new InMemoryRunRepository()
  };
}

function cloneSettings(settings: UserDigestSettings): UserDigestSettings {
  return {
    ...settings,
    categoryCounts: { ...settings.categoryCounts },
    sourceWeights: { ...settings.sourceWeights },
    mutedSources: [...settings.mutedSources],
    preferredBucketIds: [...settings.preferredBucketIds]
  };
}

function cloneDigest(digest: DigestRecord): DigestRecord {
  return {
    ...digest,
    items: digest.items.map((item) => ({
      ...item,
      sourceLinksSnapshot: [...item.sourceLinksSnapshot],
      topicsSnapshot: [...item.topicsSnapshot]
    }))
  };
}

function sourceRunKey(runId: string, sourceId: string): string {
  return `${runId}:${sourceId}`;
}
