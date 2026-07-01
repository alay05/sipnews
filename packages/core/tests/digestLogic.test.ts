import { describe, expect, it } from "vitest";
import {
  applyFeedback,
  canonicalizeUrl,
  dedupeArticles,
  filterRecentArticles,
  generateClusterId,
  inferDigestCategory,
  normalizeArticle,
  rankClusters,
  selectCategoryBalancedClusters,
  titleSimilarity,
  type Article,
  type DigestCategory,
  type StoryCluster
} from "../../core/src/index.js";

describe("core digest logic", () => {
  it("normalizes raw articles without transport or persistence dependencies", () => {
    const article = normalizeArticle({
      sourceId: "src",
      sourceName: "Source",
      sourcePriority: 1,
      sourceTopics: ["AI/Dev", "Tech"],
      title: "  Big   News ",
      url: "https://Example.com/story/?utm_source=x&id=1#section",
      excerpt: "<p>Hello world</p>"
    });

    expect(canonicalizeUrl("https://Example.com/story/?utm_source=x&id=1#section")).toBe(
      "https://example.com/story?id=1"
    );
    expect(article.title).toBe("Big News");
    expect(article.excerpt).toBe("Hello world");
    expect(article.topics).toEqual(["ai dev", "tech"]);
  });

  it("dedupes canonical URL matches and uses stable cluster ids", () => {
    const first = article("1", "OpenAI releases a new model", "https://example.com/a");
    const second = article("2", "OpenAI launches model", "https://example.com/a");

    const clusters = dedupeArticles([first, second]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].articles).toHaveLength(2);
    expect(clusters[0].id).toBe(generateClusterId([second, first]));
    expect(
      titleSimilarity(
        "Startup funding rebounds across AI companies",
        "AI startup funding rebounds across companies"
      )
    ).toBeGreaterThan(0.8);
  });

  it("filters recent articles and rejects undated articles", () => {
    const now = new Date("2026-06-09T10:30:00Z");
    const recent = article("recent", "Recent", "https://example.com/recent", {
      publishedAt: new Date("2026-06-08T10:30:00Z")
    });
    const undated = article("undated", "Undated", "https://example.com/undated");

    expect(filterRecentArticles([recent, undated], { now, maxAgeDays: 7 })).toEqual([
      recent
    ]);
  });

  it("applies feedback preferences immutably with normalized topics", () => {
    const preferences = { topicWeights: {}, sourceWeights: {}, mutedSources: [] };

    const updated = applyFeedback(preferences, {
      type: "more_topic",
      topic: "AI/Dev",
      raw: "more AI/Dev"
    });

    expect(updated.topicWeights["ai dev"]).toBe(0.25);
    expect(preferences.topicWeights).toEqual({});
  });

  it("keeps category-balanced selection intent with normalized category names", () => {
    const selected = selectCategoryBalancedClusters(categoryClusters(), {
      maxItems: 5,
      date: new Date("2026-06-05T12:00:00Z")
    });

    expect(categoryCounts(selected)).toEqual({
      general: 1,
      technology: 2,
      ai_development: 1,
      startups: 1
    });
  });

  it("ranks by source priority, preferences, duplicates, recency, and mutes", () => {
    const ranked = rankClusters(
      [
        cluster("muted", ["ai"], 0, { sourceName: "Muted" }),
        cluster("preferred", ["ai"], 0, {
          sourcePriority: 1,
          publishedAt: new Date("2026-06-09T09:30:00Z")
        }),
        cluster("plain", ["world"], 0, { sourcePriority: 1 })
      ],
      {
        topicWeights: { ai: 2 },
        sourceWeights: {},
        mutedSources: ["Muted"]
      },
      new Date("2026-06-09T10:30:00Z")
    );

    expect(ranked.map((item) => item.id)).toEqual(["preferred", "plain"]);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});

function categoryClusters(): StoryCluster[] {
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
    { general: 0, technology: 0, ai_development: 0, startups: 0 } as Record<
      DigestCategory,
      number
    >
  );
}

function cluster(
  id: string,
  topics: string[],
  score: number,
  overrides: Partial<Article> = {}
): StoryCluster {
  const representative = article(`${id}-article`, id, `https://example.com/${id}`, {
    topics,
    ...overrides
  });
  return {
    id,
    representative,
    articles: [representative],
    topics,
    score
  };
}

function article(
  id: string,
  title: string,
  canonicalUrl: string,
  overrides: Partial<Article> = {}
): Article {
  return {
    id,
    sourceId: "src",
    sourceName: "Source",
    sourcePriority: 1,
    canonicalUrl,
    title,
    fetchedAt: new Date("2026-06-05T12:00:00Z"),
    contentHash: id,
    topics: ["ai"],
    ...overrides
  };
}
