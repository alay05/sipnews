import type { SourceConfig } from "../types/articles.js";
import { GdeltAdapter } from "./gdeltAdapter.js";
import { GuardianAdapter } from "./guardianAdapter.js";
import { NotYetImplementedAdapter } from "./placeholderAdapters.js";
import { RssAdapter } from "./rssAdapter.js";
import type { SourceAdapter } from "./sourceAdapter.js";

export function createAdapter(source: SourceConfig): SourceAdapter {
  switch (source.type) {
    case "rss":
      return new RssAdapter();
    case "guardian":
      return new GuardianAdapter();
    case "gdelt":
      return new GdeltAdapter();
    case "newsapi":
    case "openai_web_search":
      return new NotYetImplementedAdapter(source.type);
  }
}
