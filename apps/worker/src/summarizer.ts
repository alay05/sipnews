import OpenAI from "openai";
import type { StoryCluster } from "@sipnews/core";
import type { ClusterSummaryDraft, ClusterSummarizer } from "./types.js";

export class OpenAIClusterSummarizer implements ClusterSummarizer {
  private readonly client: OpenAI;

  constructor(apiKey: string, private readonly model: string) {
    this.client = new OpenAI({ apiKey });
  }

  async summarize(cluster: StoryCluster): Promise<ClusterSummaryDraft> {
    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: "system",
          content:
            "Summarize one news story cluster for a daily email digest. Return compact JSON with title, summary, whyItMatters, sourceLinks, and topics. Preserve factual uncertainty and do not invent links."
        },
        {
          role: "user",
          content: JSON.stringify({
            clusterId: cluster.id,
            topics: cluster.topics,
            articles: cluster.articles.map((article: StoryCluster["articles"][number]) => ({
              title: article.title,
              sourceName: article.sourceName,
              url: article.canonicalUrl,
              excerpt: article.excerpt,
              body: article.body
            }))
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "cluster_summary",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["title", "summary", "whyItMatters", "sourceLinks", "topics"],
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
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
      }
    });

    const parsed = JSON.parse(response.output_text) as ClusterSummaryDraft;
    return {
      ...parsed,
      whyItMatters: parsed.whyItMatters ?? undefined,
      sourceLinks: parsed.sourceLinks?.length ? parsed.sourceLinks : sourceLinksForCluster(cluster),
      topics: parsed.topics?.length ? parsed.topics : cluster.topics
    };
  }
}

export function createClusterSummarizer(options: {
  openAiApiKey: string;
  openAiModel: string;
}): ClusterSummarizer {
  return new OpenAIClusterSummarizer(options.openAiApiKey, options.openAiModel);
}

function sourceLinksForCluster(cluster: StoryCluster): Array<{ sourceName: string; url: string }> {
  return cluster.articles.map((article: StoryCluster["articles"][number]) => ({
    sourceName: article.sourceName,
    url: article.canonicalUrl
  }));
}
