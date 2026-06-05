import Parser from "rss-parser";
import type { RawArticle, SourceConfig } from "../types/articles.js";
import type { SourceAdapter } from "./sourceAdapter.js";

type FeedItem = Parser.Item & {
  author?: string;
  content?: string;
  contentSnippet?: string;
  creator?: string;
};

const parser = new Parser<object, FeedItem>();

export class RssAdapter implements SourceAdapter {
  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    if (!source.url) {
      throw new Error(`RSS source ${source.id} is missing url`);
    }

    const feed = await parser.parseURL(source.url);
    return feed.items
      .filter((item) => item.title && item.link)
      .map((item) => mapFeedItem(source, item));
  }
}

export async function parseRssString(
  source: SourceConfig,
  xml: string
): Promise<RawArticle[]> {
  const feed = await parser.parseString(xml);
  return feed.items
    .filter((item) => item.title && item.link)
    .map((item) => mapFeedItem(source, item));
}

function mapFeedItem(source: SourceConfig, item: FeedItem): RawArticle {
  return {
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
  };
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
