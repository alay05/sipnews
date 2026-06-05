import type { SourceConfig } from "../types/articles.js";
import { NotYetImplementedAdapter } from "./placeholderAdapters.js";
import { RssAdapter } from "./rssAdapter.js";
import type { SourceAdapter } from "./sourceAdapter.js";

export function createAdapter(source: SourceConfig): SourceAdapter {
  switch (source.type) {
    case "rss":
      return new RssAdapter();
    case "newsapi":
    case "guardian":
    case "gdelt":
    case "openai_web_search":
      return new NotYetImplementedAdapter(source.type);
  }
}
