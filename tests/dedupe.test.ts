import { describe, expect, it } from "vitest";
import { dedupeArticles, titleSimilarity } from "../src/core/dedupe.js";
import type { Article } from "../src/types/articles.js";

describe("dedupe", () => {
  it("groups exact canonical URL matches", () => {
    const clusters = dedupeArticles([
      article("1", "OpenAI releases a new model", "https://example.com/a"),
      article("2", "OpenAI launches model", "https://example.com/a")
    ]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].articles).toHaveLength(2);
  });

  it("scores similar titles", () => {
    expect(
      titleSimilarity(
        "Startup funding rebounds across AI companies",
        "AI startup funding rebounds across companies"
      )
    ).toBeGreaterThan(0.8);
  });
});

function article(id: string, title: string, canonicalUrl: string): Article {
  return {
    id,
    sourceId: "src",
    sourceName: "Source",
    sourcePriority: 1,
    canonicalUrl,
    title,
    fetchedAt: new Date(),
    contentHash: id,
    topics: ["ai"]
  };
}
