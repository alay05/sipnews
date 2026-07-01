import Parser from "rss-parser";
import type { RawArticle, SourceConfig } from "@sms-news/core";
import type { SourceAdapter } from "./types.js";

type FeedItem = Parser.Item & {
  author?: string;
  content?: string;
  contentSnippet?: string;
  creator?: string;
};

const rssParser = new Parser<object, FeedItem>();
const GUARDIAN_ENDPOINT = "https://content.guardianapis.com/search";
const GDELT_DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";

export function createSourceAdapter(source: SourceConfig): SourceAdapter {
  switch (source.type) {
    case "rss":
      return new RssAdapter();
    case "guardian":
      return new GuardianAdapter();
    case "gdelt":
      return new GdeltAdapter();
    case "newsapi":
    case "openai_web_search":
      return new OptionalAdapter(source.type);
  }

  throw new Error(`Unsupported source adapter type: ${String(source.type)}`);
}

export class RssAdapter implements SourceAdapter {
  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    if (!source.url) throw new Error(`RSS source ${source.id} is missing url`);
    const feed = await rssParser.parseURL(source.url);
    return feed.items
      .filter((item) => item.title && item.link)
      .map((item) => ({
        sourceId: source.id,
        sourceName: source.name,
        sourcePriority: source.priority,
        sourceTopics: source.topics,
        title: item.title ?? "",
        url: item.link ?? "",
        guid: item.guid,
        excerpt: item.contentSnippet ?? item.content,
        body: item.content,
        author: item.creator ?? item.author,
        publishedAt: parseDate(item.isoDate ?? item.pubDate)
      }));
  }
}

export class GuardianAdapter implements SourceAdapter {
  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    const apiKey = guardianApiKey(source);
    if (!apiKey) {
      console.warn(`[sources] Guardian source ${source.id} has no API key; skipping.`);
      return [];
    }

    const response = await fetch(buildGuardianUrl(source, apiKey));
    if (!response.ok) {
      throw new Error(
        `Guardian source ${source.id} failed with ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as {
      response?: {
        results?: Array<{
          id?: string;
          webTitle?: string;
          webUrl?: string;
          webPublicationDate?: string;
          sectionName?: string;
          fields?: {
            trailText?: string;
            bodyText?: string;
            byline?: string;
          };
          tags?: Array<{ webTitle?: string }>;
        }>;
      };
    };

    return (payload.response?.results ?? [])
      .filter((item) => item.webTitle && item.webUrl)
      .map((item) => ({
        sourceId: source.id,
        sourceName: source.name,
        sourcePriority: source.priority,
        sourceTopics: unique([
          ...source.topics,
          item.sectionName,
          ...(item.tags ?? []).map((tag) => tag.webTitle)
        ]),
        title: item.webTitle ?? "",
        url: item.webUrl ?? "",
        guid: item.id,
        excerpt: item.fields?.trailText,
        body: item.fields?.bodyText,
        author: item.fields?.byline,
        publishedAt: parseDate(item.webPublicationDate)
      }));
  }
}

export class GdeltAdapter implements SourceAdapter {
  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    const response = await fetch(buildGdeltUrl(source));
    if (!response.ok) {
      throw new Error(
        `GDELT source ${source.id} failed with ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as {
      articles?: Array<{
        url?: string;
        title?: string;
        seendate?: string;
        domain?: string;
        sourceCountry?: string;
        language?: string;
      }>;
    };

    return (payload.articles ?? [])
      .filter((item) => item.title && item.url)
      .map((item) => ({
        sourceId: source.id,
        sourceName: item.domain ? `${source.name} (${item.domain})` : source.name,
        sourcePriority: source.priority,
        sourceTopics: unique([
          ...source.topics,
          item.domain,
          item.sourceCountry,
          item.language
        ]),
        title: item.title ?? "",
        url: item.url ?? "",
        guid: item.url,
        excerpt: item.domain ? `Discovered by GDELT from ${item.domain}` : "Discovered by GDELT",
        publishedAt: parseGdeltDate(item.seendate)
      }));
  }
}

class OptionalAdapter implements SourceAdapter {
  constructor(private readonly adapterName: string) {}

  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    console.warn(
      `[sources] ${this.adapterName} adapter is configured for ${source.id}, but this optional adapter is not implemented yet.`
    );
    return [];
  }
}

function buildGuardianUrl(source: SourceConfig, apiKey: string): string {
  const config = source.config ?? {};
  const url = new URL(GUARDIAN_ENDPOINT);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("show-fields", stringConfig(config.showFields) ?? "trailText,bodyText,byline");
  url.searchParams.set("page-size", String(numberConfig(config.pageSize) ?? 20));
  url.searchParams.set("order-by", stringConfig(config.orderBy) ?? "newest");

  const section = stringConfig(config.section);
  const tag = stringConfig(config.tag);
  const query = stringConfig(config.query);
  if (section) url.searchParams.set("section", section);
  if (tag) url.searchParams.set("tag", tag);
  if (query) url.searchParams.set("q", query);

  return url.toString();
}

function buildGdeltUrl(source: SourceConfig): string {
  const config = source.config ?? {};
  const query = buildGdeltQuery(config);
  if (!query) throw new Error(`GDELT source ${source.id} requires config.query or domain filters`);

  const url = new URL(GDELT_DOC_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(numberConfig(config.maxRecords) ?? 20));
  url.searchParams.set("sort", stringConfig(config.sort) ?? "HybridRel");

  const timespan = stringConfig(config.timespan);
  const startDateTime = stringConfig(config.startDateTime);
  const endDateTime = stringConfig(config.endDateTime);
  if (timespan) url.searchParams.set("timespan", timespan);
  if (startDateTime) url.searchParams.set("startdatetime", startDateTime);
  if (endDateTime) url.searchParams.set("enddatetime", endDateTime);

  return url.toString();
}

function buildGdeltQuery(config: Record<string, unknown>): string {
  const parts: string[] = [];
  const query = stringConfig(config.query);
  const domain = stringConfig(config.domain);
  const domains = Array.isArray(config.domains)
    ? config.domains.filter((item): item is string => typeof item === "string")
    : [];

  if (query) parts.push(query);
  if (domain) parts.push(`domain:${domain}`);
  if (domains.length) parts.push(`(${domains.map((item) => `domain:${item}`).join(" OR ")})`);
  return parts.join(" ").trim();
}

function guardianApiKey(source: SourceConfig): string | undefined {
  const config = source.config ?? {};
  const inline = stringConfig(config.apiKey);
  if (inline) return inline;
  return process.env[stringConfig(config.apiKeyEnv) ?? "THE_GUARDIAN_API_KEY"];
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseGdeltDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return parseDate(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function stringConfig(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberConfig(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
