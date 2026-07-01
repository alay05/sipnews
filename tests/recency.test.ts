import { describe, expect, it } from "vitest";
import { filterRecentArticles, isRecentArticle } from "@sms-news/core";
import type { Article } from "@sms-news/core";

describe("article recency", () => {
  const now = new Date("2026-06-09T10:30:00Z");

  it("keeps only articles inside the configured freshness window", () => {
    const recent = article("recent", new Date("2026-06-08T10:30:00Z"));
    const old = article("old", new Date("2017-01-01T10:30:00Z"));

    expect(
      filterRecentArticles([recent, old], { now, maxAgeDays: 7 }).map(
        (item) => item.id
      )
    ).toEqual(["recent"]);
  });

  it("rejects articles without a publish date", () => {
    expect(isRecentArticle(article("undated"), { now, maxAgeDays: 7 })).toBe(false);
  });
});

function article(id: string, publishedAt?: Date): Article {
  return {
    id,
    sourceId: "source",
    sourceName: "Source",
    sourcePriority: 1,
    canonicalUrl: `https://example.com/${id}`,
    title: id,
    publishedAt,
    fetchedAt: new Date("2026-06-09T10:30:00Z"),
    contentHash: id,
    topics: ["ai"]
  };
}
