import type { RawArticle, SourceConfig } from "../types/articles.js";

export interface SourceAdapter {
  fetch(source: SourceConfig): Promise<RawArticle[]>;
}
