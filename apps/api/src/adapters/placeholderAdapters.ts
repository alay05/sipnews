import type { RawArticle, SourceConfig } from "../types/articles.js";
import type { SourceAdapter } from "./sourceAdapter.js";

export class NotYetImplementedAdapter implements SourceAdapter {
  constructor(private readonly adapterName: string) {}

  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    console.warn(
      `[sources] ${this.adapterName} adapter is configured for ${source.id}, but this optional adapter is not implemented yet.`
    );
    return [];
  }
}
