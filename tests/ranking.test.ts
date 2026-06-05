import { describe, expect, it } from "vitest";
import {
  type DigestCategory,
  inferDigestCategory,
  selectCategoryBalancedClusters
} from "../src/core/ranking.js";
import type { Article, StoryCluster } from "../src/types/articles.js";

describe("category-balanced ranking", () => {
  it("selects 1 general, 2 tech, 1 ai-dev, and 1 startup on odd UTC dates", () => {
    const selected = selectCategoryBalancedClusters(clusters(), {
      maxItems: 5,
      date: new Date("2026-06-05T12:00:00Z")
    });

    expect(categoryCounts(selected)).toEqual({
      general: 1,
      tech: 2,
      "ai-dev": 1,
      startups: 1
    });
  });

  it("selects 1 general, 1 tech, 2 ai-dev, and 1 startup on even UTC dates", () => {
    const selected = selectCategoryBalancedClusters(clusters(), {
      maxItems: 5,
      date: new Date("2026-06-06T12:00:00Z")
    });

    expect(categoryCounts(selected)).toEqual({
      general: 1,
      tech: 1,
      "ai-dev": 2,
      startups: 1
    });
  });

  it("fills missing category slots by global ranked order without duplicates", () => {
    const selected = selectCategoryBalancedClusters(
      [
        cluster("general-1", ["world"], 10),
        cluster("ai-1", ["ai"], 9),
        cluster("tech-1", ["tech"], 8),
        cluster("tech-2", ["tech industry"], 7),
        cluster("ai-2", ["programming"], 6)
      ],
      {
        maxItems: 5,
        date: new Date("2026-06-05T12:00:00Z")
      }
    );

    expect(selected.map((item) => item.id)).toEqual([
      "general-1",
      "ai-1",
      "tech-1",
      "tech-2",
      "ai-2"
    ]);
    expect(new Set(selected.map((item) => item.id)).size).toBe(5);
  });
});

function clusters(): StoryCluster[] {
  return [
    cluster("general-1", ["general"], 10),
    cluster("tech-1", ["tech"], 9),
    cluster("ai-1", ["openai"], 8),
    cluster("startup-1", ["startup"], 7),
    cluster("tech-2", ["technology"], 6),
    cluster("ai-2", ["github"], 5),
    cluster("startup-2", ["venture"], 4),
    cluster("general-2", ["us"], 3)
  ];
}

function categoryCounts(
  selected: StoryCluster[]
): Record<DigestCategory, number> {
  return selected.reduce(
    (counts, item) => {
      counts[inferDigestCategory(item)] += 1;
      return counts;
    },
    { general: 0, tech: 0, "ai-dev": 0, startups: 0 } as Record<
      DigestCategory,
      number
    >
  );
}

function cluster(id: string, topics: string[], score: number): StoryCluster {
  return {
    id,
    representative: article(`${id}-article`, topics),
    articles: [article(`${id}-article`, topics)],
    topics,
    score
  };
}

function article(id: string, topics: string[]): Article {
  return {
    id,
    sourceId: "src",
    sourceName: "Source",
    sourcePriority: 1,
    canonicalUrl: `https://example.com/${id}`,
    title: id,
    fetchedAt: new Date("2026-06-05T12:00:00Z"),
    contentHash: id,
    topics
  };
}
