import { describe, expect, it } from "vitest";
import { canonicalizeUrl, normalizeArticle } from "../src/core/normalize.js";

describe("normalize", () => {
  it("removes tracking params and URL fragments", () => {
    expect(
      canonicalizeUrl("https://Example.com/story/?utm_source=x&id=1#section")
    ).toBe("https://example.com/story?id=1");
  });

  it("normalizes a raw article", () => {
    const article = normalizeArticle({
      sourceId: "src",
      sourceName: "Source",
      sourcePriority: 1,
      sourceTopics: ["AI", "Tech"],
      title: "  Big   News ",
      url: "https://example.com/a?utm_medium=sms",
      excerpt: "<p>Hello world</p>"
    });

    expect(article.title).toBe("Big News");
    expect(article.excerpt).toBe("Hello world");
    expect(article.topics).toEqual(["ai", "tech"]);
  });
});
