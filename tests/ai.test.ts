import { describe, expect, it } from "vitest";
import { alignDigestItems } from "../src/services/ai.js";
import type { Article, DigestItem, StoryCluster } from "../src/types/articles.js";

describe("AI digest item alignment", () => {
  it("returns one sequentially numbered item per selected cluster", () => {
    const clusters = [
      cluster("cluster-1", "First selected story"),
      cluster("cluster-2", "Second selected story"),
      cluster("cluster-3", "Third selected story")
    ];
    const aligned = alignDigestItems(clusters, [
      aiItem({ index: 1, clusterId: "cluster-1", title: "AI first" }),
      aiItem({ index: 3, clusterId: "cluster-3", title: "AI third" })
    ]);

    expect(aligned).toHaveLength(3);
    expect(aligned.map((item) => item.index)).toEqual([1, 2, 3]);
    expect(aligned.map((item) => item.clusterId)).toEqual([
      "cluster-1",
      "cluster-2",
      "cluster-3"
    ]);
    expect(aligned.map((item) => item.title)).toEqual([
      "AI first",
      "Second selected story",
      "AI third"
    ]);
  });
});

function aiItem(overrides: Partial<DigestItem>): DigestItem {
  return {
    index: 1,
    clusterId: "cluster",
    title: "AI title",
    shortSummary: "AI summary",
    sourceLinks: [{ sourceName: "AI Source", url: "https://example.com/ai" }],
    topics: ["ai"],
    ...overrides
  };
}

function cluster(id: string, title: string): StoryCluster {
  return {
    id,
    representative: article(`${id}-article`, title),
    articles: [article(`${id}-article`, title)],
    topics: ["tech"],
    score: 1
  };
}

function article(id: string, title: string): Article {
  return {
    id,
    sourceId: "source",
    sourceName: "Source",
    sourcePriority: 1,
    canonicalUrl: `https://example.com/${id}`,
    title,
    excerpt: `${title} summary`,
    fetchedAt: new Date("2026-06-08T12:00:00Z"),
    contentHash: id,
    topics: ["tech"]
  };
}
