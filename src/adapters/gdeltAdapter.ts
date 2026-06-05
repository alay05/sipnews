import type { RawArticle, SourceConfig } from "../types/articles.js";
import type { SourceAdapter } from "./sourceAdapter.js";

const GDELT_DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";

interface GdeltConfig {
  query?: string;
  domain?: string;
  domains?: string[];
  maxRecords?: number;
  timespan?: string;
  startDateTime?: string;
  endDateTime?: string;
  sort?: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  sourceCountry?: string;
  language?: string;
}

export class GdeltAdapter implements SourceAdapter {
  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    const response = await fetch(buildGdeltUrl(source));
    if (!response.ok) {
      throw new Error(
        `GDELT source ${source.id} failed with ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as GdeltResponse;
    return mapGdeltResponse(source, payload);
  }
}

export function buildGdeltUrl(source: SourceConfig): string {
  const config = getGdeltConfig(source);
  const query = buildGdeltQuery(config);
  if (!query) {
    throw new Error(`GDELT source ${source.id} requires config.query or domain filters`);
  }

  const url = new URL(GDELT_DOC_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(config.maxRecords ?? 20));
  url.searchParams.set("sort", config.sort ?? "HybridRel");

  if (config.timespan) url.searchParams.set("timespan", config.timespan);
  if (config.startDateTime) url.searchParams.set("startdatetime", config.startDateTime);
  if (config.endDateTime) url.searchParams.set("enddatetime", config.endDateTime);

  return url.toString();
}

export function mapGdeltResponse(
  source: SourceConfig,
  payload: GdeltResponse
): RawArticle[] {
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

function buildGdeltQuery(config: GdeltConfig): string {
  const parts: string[] = [];
  if (config.query) parts.push(config.query);
  if (config.domain) parts.push(`domain:${config.domain}`);
  if (config.domains?.length) {
    parts.push(`(${config.domains.map((domain) => `domain:${domain}`).join(" OR ")})`);
  }

  return parts.join(" ").trim();
}

function getGdeltConfig(source: SourceConfig): GdeltConfig {
  return source.config ?? {};
}

function parseGdeltDate(value?: string): Date | undefined {
  if (!value) return undefined;

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
