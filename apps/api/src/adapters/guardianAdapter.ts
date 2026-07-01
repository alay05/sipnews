import type { RawArticle, SourceConfig } from "../types/articles.js";
import type { SourceAdapter } from "./sourceAdapter.js";

const GUARDIAN_ENDPOINT = "https://content.guardianapis.com/search";

interface GuardianFieldConfig {
  section?: string;
  tag?: string;
  query?: string;
  pageSize?: number;
  orderBy?: string;
  showFields?: string;
  apiKey?: string;
  apiKeyEnv?: string;
}

interface GuardianApiResponse {
  response?: {
    results?: GuardianResult[];
  };
}

interface GuardianResult {
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
  tags?: Array<{
    webTitle?: string;
  }>;
}

export class GuardianAdapter implements SourceAdapter {
  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    const apiKey = resolveGuardianApiKey(source);
    if (!apiKey) {
      console.warn(
        `[sources] Guardian source ${source.id} requires THE_GUARDIAN_API_KEY or config.apiKey.`
      );
      return [];
    }

    const response = await fetch(buildGuardianUrl(source, apiKey));
    if (!response.ok) {
      throw new Error(
        `Guardian source ${source.id} failed with ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as GuardianApiResponse;
    return mapGuardianResponse(source, payload);
  }
}

export function buildGuardianUrl(source: SourceConfig, apiKey: string): string {
  const config = getGuardianConfig(source);
  const url = new URL(GUARDIAN_ENDPOINT);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("show-fields", config.showFields ?? "trailText,bodyText,byline");
  url.searchParams.set("page-size", String(config.pageSize ?? 20));
  url.searchParams.set("order-by", config.orderBy ?? "newest");

  if (config.section) url.searchParams.set("section", config.section);
  if (config.tag) url.searchParams.set("tag", config.tag);
  if (config.query) url.searchParams.set("q", config.query);

  return url.toString();
}

export function mapGuardianResponse(
  source: SourceConfig,
  payload: GuardianApiResponse
): RawArticle[] {
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

function resolveGuardianApiKey(source: SourceConfig): string | undefined {
  const config = getGuardianConfig(source);
  if (config.apiKey) return config.apiKey;

  const envName = config.apiKeyEnv ?? "THE_GUARDIAN_API_KEY";
  return process.env[envName];
}

function getGuardianConfig(source: SourceConfig): GuardianFieldConfig {
  return source.config ?? {};
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
