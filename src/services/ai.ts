import OpenAI from "openai";
import type { DigestItem, StoryCluster } from "../types/articles.js";

export interface NewsSummarizer {
  summarize(clusters: StoryCluster[]): Promise<DigestItem[]>;
}

export class HeuristicSummarizer implements NewsSummarizer {
  async summarize(clusters: StoryCluster[]): Promise<DigestItem[]> {
    return clusters.map(fallbackDigestItem);
  }
}

export class OpenAINewsSummarizer implements NewsSummarizer {
  private readonly client: OpenAI;

  constructor(apiKey: string, private readonly model: string) {
    this.client = new OpenAI({ apiKey });
  }

  async summarize(clusters: StoryCluster[]): Promise<DigestItem[]> {
    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: "system",
          content:
            "Summarize news clusters into useful daily news digest items. Return exactly one item for every input cluster, preserving each input clusterId. For each shortSummary, write 4-6 substantive sentences covering the core facts, context, why it matters, and concrete implications for a tech-focused reader. Keep titles concise. Return compact JSON only."
        },
        {
          role: "user",
          content: JSON.stringify(
            clusters.map((cluster, index) => ({
              index: index + 1,
              clusterId: cluster.id,
              topics: cluster.topics,
              articles: cluster.articles.map((article) => ({
                title: article.title,
                sourceName: article.sourceName,
                url: article.canonicalUrl,
                excerpt: article.excerpt
              }))
            }))
          )
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "news_digest_items",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "index",
                    "clusterId",
                    "title",
                    "shortSummary",
                    "whyItMatters",
                    "sourceLinks",
                    "topics"
                  ],
                  properties: {
                    index: { type: "number" },
                    clusterId: { type: "string" },
                    title: { type: "string" },
                    shortSummary: { type: "string" },
                    whyItMatters: { type: ["string", "null"] },
                    sourceLinks: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["sourceName", "url"],
                        properties: {
                          sourceName: { type: "string" },
                          url: { type: "string" }
                        }
                      }
                    },
                    topics: { type: "array", items: { type: "string" } }
                  }
                }
              }
            },
            required: ["items"]
          },
          strict: true
        }
      }
    });

    const parsed = JSON.parse(response.output_text) as { items: DigestItem[] };
    return alignDigestItems(clusters, parsed.items);
  }
}

export function alignDigestItems(
  clusters: StoryCluster[],
  items: DigestItem[]
): DigestItem[] {
  const byClusterId = new Map(items.map((item) => [item.clusterId, item]));

  return clusters.map((cluster, index) => {
    const item = byClusterId.get(cluster.id) ?? fallbackDigestItem(cluster, index);
    return {
      ...fallbackDigestItem(cluster, index),
      ...item,
      index: index + 1,
      clusterId: cluster.id,
      sourceLinks: item.sourceLinks?.length
        ? item.sourceLinks
        : sourceLinksForCluster(cluster),
      topics: item.topics?.length ? item.topics : cluster.topics
    };
  });
}

function fallbackDigestItem(cluster: StoryCluster, index: number): DigestItem {
  const article = cluster.representative;
  return {
    index: index + 1,
    clusterId: cluster.id,
    title: article.title,
    shortSummary:
      article.excerpt ??
      "Open the linked article for details. This local stub is used until OpenAI is configured.",
    whyItMatters:
      cluster.articles.length > 1
        ? `Covered by ${cluster.articles.length} configured sources.`
        : undefined,
    sourceLinks: sourceLinksForCluster(cluster),
    topics: cluster.topics
  };
}

function sourceLinksForCluster(cluster: StoryCluster): DigestItem["sourceLinks"] {
  return cluster.articles.map((item) => ({
    sourceName: item.sourceName,
    url: item.canonicalUrl
  }));
}

export function createSummarizer(options: {
  openAiApiKey?: string;
  openAiModel: string;
}): NewsSummarizer {
  if (!options.openAiApiKey) return new HeuristicSummarizer();
  return new OpenAINewsSummarizer(options.openAiApiKey, options.openAiModel);
}
