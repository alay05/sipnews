import type { Article, RawArticle } from "./types.js";
import { hashContent } from "./hash.js";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid"
]);

export function normalizeArticle(raw: RawArticle): Article {
  const canonicalUrl = canonicalizeUrl(raw.url);
  const title = normalizeWhitespace(raw.title);
  const contentHash = hashContent(
    [canonicalUrl, title, raw.excerpt ?? "", raw.body ?? ""].join("\n")
  );

  return {
    id: hashContent(`${raw.sourceId}:${canonicalUrl}`),
    sourceId: raw.sourceId,
    sourceName: raw.sourceName,
    sourcePriority: raw.sourcePriority,
    canonicalUrl,
    title,
    excerpt: raw.excerpt ? normalizeWhitespace(stripHtml(raw.excerpt)) : undefined,
    body: raw.body ? normalizeWhitespace(stripHtml(raw.body)) : undefined,
    author: raw.author,
    publishedAt: raw.publishedAt,
    fetchedAt: new Date(),
    contentHash,
    topics: unique(raw.sourceTopics.map(normalizeTopic))
  };
}

export function canonicalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";

  for (const param of Array.from(url.searchParams.keys())) {
    if (TRACKING_PARAMS.has(param.toLowerCase())) {
      url.searchParams.delete(param);
    }
  }

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

export function normalizeTitleForComparison(title: string): string {
  return normalizeWhitespace(title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

export function normalizeTopic(topic: string): string {
  return topic.toLowerCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
