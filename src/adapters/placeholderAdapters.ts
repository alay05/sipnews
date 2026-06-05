import type { RawArticle, SourceConfig } from "../types/articles.js";
import type { SourceAdapter } from "./sourceAdapter.js";

export class NotYetImplementedAdapter implements SourceAdapter {
  constructor(private readonly adapterName: string) {}

  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    console.warn(
      `[sources] ${this.adapterName} adapter is configured for ${source.id}, but only the RSS adapter is implemented in this scaffold.`
    );
    return [];
  }
}
