import { describe, expect, it } from "vitest";
import {
  deriveBucketMembership,
  deriveBucketPools,
  deriveQuotaFromTopicWeights,
  generateSummaryCacheKey,
  selectClustersForUserFromBuckets,
  type Article,
  type StoryCluster
} from "../../core/src/index.js";

describe("bucket helpers", () => {
  it("derives bucket membership from normalized category inference", () => {
    expect(deriveBucketMembership(cluster("a", ["github"]))).toEqual({
      clusterId: "a",
      bucket: "ai_development",
      topics: ["github"]
    });
  });

  it("derives integer quotas from topic weights and total item count", () => {
    expect(
      deriveQuotaFromTopicWeights(
        { ai_development: 3, technology: 1 },
        5,
        new Date("2026-06-06T12:00:00Z")
      )
    ).toEqual({
      general: 1,
      technology: 1,
      ai_development: 2,
      startups: 1
    });
  });

  it("selects per-user items from shared bucket pools with fallback fill", () => {
    const pools = deriveBucketPools([
      cluster("ai-1", ["ai"], 1),
      cluster("ai-2", ["github"], 1),
      cluster("tech-1", ["technology"], 1),
      cluster("startup-1", ["startup"], 1),
      cluster("general-1", ["world"], 1)
    ]);

    const selected = selectClustersForUserFromBuckets(
      pools,
      {
        topicWeights: { ai_development: 3 },
        sourceWeights: {},
        mutedSources: []
      },
      {
        totalItemCount: 3,
        now: new Date("2026-06-09T10:30:00Z"),
        date: new Date("2026-06-06T12:00:00Z")
      }
    );

    expect(selected.map((item) => item.id)).toEqual(["general-1", "ai-1", "tech-1"]);
  });

  it("generates stable summary cache keys for the semantic cache dimensions", () => {
    const key = generateSummaryCacheKey({
      clusterId: "cluster_123",
      length: "short",
      model: "GPT-4.1-Mini",
      promptVersion: "v2"
    });

    expect(key).toMatch(/^summary_[a-f0-9]{32}$/);
    expect(key).toBe(
      generateSummaryCacheKey({
        clusterId: "cluster_123",
        length: "short",
        model: "gpt-4.1-mini",
        promptVersion: "v2"
      })
    );
  });
});

function cluster(id: string, topics: string[], sourcePriority = 1): StoryCluster {
  const representative = article(id, topics, sourcePriority);
  return {
    id,
    representative,
    articles: [representative],
    topics,
    score: 0
  };
}

function article(id: string, topics: string[], sourcePriority: number): Article {
  return {
    id: `${id}-article`,
    sourceId: "src",
    sourceName: "Source",
    sourcePriority,
    canonicalUrl: `https://example.com/${id}`,
    title: id,
    publishedAt: new Date("2026-06-09T09:30:00Z"),
    fetchedAt: new Date("2026-06-09T10:30:00Z"),
    contentHash: id,
    topics
  };
}
