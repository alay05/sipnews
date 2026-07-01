import { describe, expect, it } from "vitest";
import type { RawArticle, SourceConfig, StoryCluster } from "@sipnews/core";
import {
  createInMemoryRepositories,
  InMemoryContentRepository,
  InMemoryRunRepository,
  type DataRepositories,
  type DigestRecord
} from "@sipnews/data";
import { BucketedWorkerPipeline } from "./pipeline.js";
import type {
  ClusterSummaryDraft,
  ClusterSummarizer,
  EmailClient,
  EmailMessage,
  SourceAdapter
} from "./types.js";

describe("BucketedWorkerPipeline", () => {
  it("fetches, clusters, summarizes once and assembles per-user email digests from shared pools", async () => {
    const repositories = createInMemoryRepositories();
    await seedDueEmailUser(repositories, {
      id: "ai-user",
      email: "ai@example.com",
      categoryCounts: { world: 0, tech: 0, ai: 2, startups: 0 },
      digestMaxItems: 2
    });
    await seedDueEmailUser(repositories, {
      id: "tech-user",
      email: "tech@example.com",
      categoryCounts: { world: 0, tech: 2, ai: 0, startups: 0 },
      digestMaxItems: 2
    });
    await seedDueEmailUser(repositories, {
      id: "sms-user",
      email: "sms@example.com",
      deliveryChannel: "sms"
    });

    const adapter = new FakeSourceAdapter({
      "ai-feed": [rawArticle("ai-feed", "AI Feed", "AI model release", ["ai"])],
      "tech-feed": [
        rawArticle("tech-feed", "Tech Feed", "Chip platform update", ["tech"]),
        rawArticle("tech-feed", "Tech Feed", "Startup funding round", ["startup"])
      ],
      "world-feed": [rawArticle("world-feed", "World Feed", "World leaders meet", ["world"])]
    });
    const summarizer = new FakeSummarizer();
    const email = new FakeEmailClient();

    const result = await new BucketedWorkerPipeline({
      repositories,
      sources: [
        source("ai-feed", "AI Feed", ["ai"]),
        source("tech-feed", "Tech Feed", ["tech"]),
        source("world-feed", "World Feed", ["world"])
      ],
      adapterForSource: () => adapter,
      summarizer,
      emailClient: email,
      emailFrom: "digest@example.com",
      publicBaseUrl: "https://digest.example",
      now: new Date("2026-06-30T12:00:00Z")
    }).run();

    const content = repositories.content as InMemoryContentRepository;
    const runs = repositories.runs as InMemoryRunRepository;
    const deliveredDigests = await Promise.all(
      result.digests.map((digest) => repositories.digests.getDigest(digest.id))
    );

    expect(adapter.fetchCounts).toEqual({
      "ai-feed": 1,
      "tech-feed": 1,
      "world-feed": 1
    });
    expect(result).toMatchObject({
      articlesSeen: 4,
      articlesSaved: 4,
      clustersTouched: 4,
      dueUsers: 2
    });
    expect(summarizer.clusterIds).toHaveLength(4);
    expect(content.summaries.size).toBe(4);
    expect(content.variants.size).toBe(12);
    expect(email.messages).toHaveLength(2);
    expect([...runs.deliveryRuns.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: "email", status: "succeeded" })
      ])
    );
    expect(deliveredDigests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "ai-user",
          localDate: "2026-06-30",
          status: "delivered",
          items: expect.arrayContaining([
            expect.objectContaining({
              clusterId: expect.stringMatching(/^cluster_/),
              summaryVariantId: expect.stringMatching(/^summary_/),
              bucketId: expect.any(String)
            })
          ])
        })
      ])
    );
    expect(
      deliveredDigests.flatMap((digest) => digest?.items ?? []).every((item) => {
        const variant = content.variants.get(item.summaryVariantId);
        return variant?.variantType === "medium";
      })
    ).toBe(true);
  });

  it("does not send another email for an already delivered same-day digest", async () => {
    const repositories = createInMemoryRepositories();
    await seedDueEmailUser(repositories, {
      id: "user-1",
      email: "user@example.com"
    });
    await repositories.digests.saveDigest(deliveredDigest("existing-digest", "user-1"));

    const email = new FakeEmailClient();
    const result = await new BucketedWorkerPipeline({
      repositories,
      sources: [source("ai-feed", "AI Feed", ["ai"])],
      adapterForSource: () =>
        new FakeSourceAdapter({
          "ai-feed": [rawArticle("ai-feed", "AI Feed", "AI model release", ["ai"])]
        }),
      summarizer: new FakeSummarizer(),
      emailClient: email,
      emailFrom: "digest@example.com",
      publicBaseUrl: "https://digest.example",
      now: new Date("2026-06-30T12:00:00Z")
    }).run();

    expect(result.digests).toHaveLength(0);
    expect(email.messages).toHaveLength(0);
  });
});

class FakeSourceAdapter implements SourceAdapter {
  readonly fetchCounts: Record<string, number> = {};

  constructor(private readonly articlesBySourceId: Record<string, RawArticle[]>) {}

  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    this.fetchCounts[source.id] = (this.fetchCounts[source.id] ?? 0) + 1;
    return this.articlesBySourceId[source.id] ?? [];
  }
}

class FakeSummarizer implements ClusterSummarizer {
  readonly clusterIds: string[] = [];

  async summarize(cluster: StoryCluster): Promise<ClusterSummaryDraft> {
    this.clusterIds.push(cluster.id);
    return {
      title: `Summary for ${cluster.representative.title}`,
      summary: `${cluster.representative.title} summary with enough detail for a reusable canonical cluster summary.`,
      whyItMatters: "It changes the user's daily context.",
      sourceLinks: cluster.articles.map((article: StoryCluster["articles"][number]) => ({
        sourceName: article.sourceName,
        url: article.canonicalUrl
      })),
      topics: cluster.topics
    };
  }
}

class FakeEmailClient implements EmailClient {
  readonly messages: EmailMessage[] = [];

  async sendEmail(message: EmailMessage): Promise<{ providerMessageId: string }> {
    this.messages.push(message);
    return { providerMessageId: `message-${this.messages.length}` };
  }
}

async function seedDueEmailUser(
  repositories: DataRepositories,
  input: {
    id: string;
    email: string;
    categoryCounts?: { world: number; tech: number; ai: number; startups: number };
    digestMaxItems?: number;
    deliveryChannel?: string;
    summaryLength?: "small" | "medium" | "large";
  }
): Promise<void> {
  await repositories.users.upsertUser({
    id: input.id,
    externalAuthProvider: "test",
    externalAuthSubject: input.email,
    email: input.email,
    isActive: true
  });
  await repositories.users.upsertDigestSettings({
    userId: input.id,
    timezone: "America/New_York",
    sendHour: 8,
    digestMaxItems: input.digestMaxItems ?? 3,
    summaryLength: input.summaryLength ?? "medium",
    deliveryChannel: input.deliveryChannel ?? "email",
    deliveryAddress: input.email,
    categoryCounts:
      input.categoryCounts ??
      {
        world: input.digestMaxItems ?? 3,
        tech: 0,
        ai: 0,
        startups: 0
      },
    sourceWeights: {},
    mutedSources: [],
    preferredBucketIds: [],
    includeBucketLabels: true
  });
}

function source(id: string, name: string, topics: string[]): SourceConfig {
  return {
    id,
    name,
    type: "rss",
    enabled: true,
    priority: 1,
    url: `https://example.com/${id}.xml`,
    topics
  };
}

function rawArticle(
  sourceId: string,
  sourceName: string,
  title: string,
  topics: string[]
): RawArticle {
  return {
    sourceId,
    sourceName,
    sourcePriority: 1,
    sourceTopics: topics,
    title,
    url: `https://example.com/articles/${encodeURIComponent(title)}`,
    excerpt: `${title} excerpt`,
    publishedAt: new Date("2026-06-30T11:30:00Z")
  };
}

function deliveredDigest(id: string, userId: string): DigestRecord {
  return {
    id,
    userId,
    localDate: "2026-06-30",
    status: "delivered",
    title: "Daily news digest - 2026-06-30",
    generatedAt: new Date("2026-06-30T12:00:00Z"),
    deliveredAt: new Date("2026-06-30T12:00:00Z"),
    items: []
  };
}
