import { describe, expect, it } from "vitest";
import {
  buildGdeltUrl,
  mapGdeltResponse
} from "../apps/api/src/adapters/gdeltAdapter.js";
import {
  buildGuardianUrl,
  mapGuardianResponse
} from "../apps/api/src/adapters/guardianAdapter.js";
import { loadSourcesConfig } from "../apps/api/src/config/sources.js";
import type { SourceConfig } from "../apps/api/src/types/articles.js";

const guardianSource: SourceConfig = {
  id: "guardian-world",
  name: "The Guardian World",
  type: "guardian",
  enabled: true,
  priority: 0.72,
  topics: ["general", "general_world_us"],
  config: {
    section: "world",
    pageSize: 15
  }
};

const gdeltSource: SourceConfig = {
  id: "gdelt-ai",
  name: "GDELT AI Discovery",
  type: "gdelt",
  enabled: true,
  priority: 0.7,
  topics: ["ai", "ai_dev_programming"],
  config: {
    query: "(Claude OR Anthropic)",
    domains: ["anthropic.com", "example.com"],
    maxRecords: 10,
    timespan: "7d"
  }
};

describe("source config", () => {
  it("loads the 20-source MVP mix with category tags", async () => {
    const sources = await loadSourcesConfig("config/sources.example.json");

    expect(sources).toHaveLength(20);
    expect(countSourcesWithTopic(sources, "general_world_us")).toBe(4);
    expect(countSourcesWithTopic(sources, "tech_industry")).toBe(6);
    expect(countSourcesWithTopic(sources, "ai_dev_programming")).toBe(6);
    expect(countSourcesWithTopic(sources, "startups")).toBe(4);
  });
});

describe("GuardianAdapter helpers", () => {
  it("constructs a Guardian search URL from source config", () => {
    const url = new URL(buildGuardianUrl(guardianSource, "test-key"));

    expect(url.origin + url.pathname).toBe("https://content.guardianapis.com/search");
    expect(url.searchParams.get("api-key")).toBe("test-key");
    expect(url.searchParams.get("section")).toBe("world");
    expect(url.searchParams.get("page-size")).toBe("15");
    expect(url.searchParams.get("show-fields")).toContain("trailText");
  });

  it("maps Guardian response results into raw articles", () => {
    const articles = mapGuardianResponse(guardianSource, {
      response: {
        results: [
          {
            id: "world/2026/example",
            webTitle: "A major world story",
            webUrl: "https://www.theguardian.com/world/2026/example",
            webPublicationDate: "2026-06-05T12:00:00Z",
            sectionName: "World news",
            fields: {
              trailText: "Short excerpt",
              bodyText: "Full article text",
              byline: "Reporter"
            },
            tags: [{ webTitle: "United States" }]
          }
        ]
      }
    });

    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      sourceId: "guardian-world",
      title: "A major world story",
      url: "https://www.theguardian.com/world/2026/example",
      excerpt: "Short excerpt",
      body: "Full article text",
      author: "Reporter"
    });
    expect(articles[0].sourceTopics).toContain("World news");
    expect(articles[0].publishedAt?.toISOString()).toBe("2026-06-05T12:00:00.000Z");
  });
});

describe("GdeltAdapter helpers", () => {
  it("constructs a DOC 2.0 ArtList URL with OR domain filters", () => {
    const url = new URL(buildGdeltUrl(gdeltSource));

    expect(url.origin + url.pathname).toBe("https://api.gdeltproject.org/api/v2/doc/doc");
    expect(url.searchParams.get("mode")).toBe("ArtList");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("maxrecords")).toBe("10");
    expect(url.searchParams.get("timespan")).toBe("7d");
    expect(url.searchParams.get("query")).toContain(
      "(domain:anthropic.com OR domain:example.com)"
    );
  });

  it("maps GDELT article list results into raw articles", () => {
    const articles = mapGdeltResponse(gdeltSource, {
      articles: [
        {
          title: "Anthropic announces a Claude update",
          url: "https://www.anthropic.com/news/example",
          seendate: "2026-06-05 12:30:00",
          domain: "anthropic.com",
          sourceCountry: "United States",
          language: "English"
        }
      ]
    });

    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      sourceId: "gdelt-ai",
      sourceName: "GDELT AI Discovery (anthropic.com)",
      title: "Anthropic announces a Claude update",
      url: "https://www.anthropic.com/news/example",
      guid: "https://www.anthropic.com/news/example"
    });
    expect(articles[0].sourceTopics).toContain("anthropic.com");
    expect(articles[0].publishedAt?.toISOString()).toBe("2026-06-05T12:30:00.000Z");
  });
});

function countSourcesWithTopic(sources: SourceConfig[], topic: string): number {
  return sources.filter((source) => source.topics.includes(topic)).length;
}
