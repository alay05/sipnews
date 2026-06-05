import { randomUUID } from "node:crypto";
import { createAdapter } from "../adapters/index.js";
import { buildDigestSms } from "../core/sms.js";
import { dedupeArticles } from "../core/dedupe.js";
import { normalizeArticle } from "../core/normalize.js";
import { rankClusters, selectCategoryBalancedClusters } from "../core/ranking.js";
import type { SourceConfig, Digest } from "../types/articles.js";
import type { NewsSummarizer } from "./ai.js";
import type { SmsClient } from "./twilio.js";
import type { AppStore } from "./store.js";

export interface DigestPipelineOptions {
  sources: SourceConfig[];
  maxItems: number;
  publicBaseUrl: string;
  smsTo?: string;
  smsFrom?: string;
  digestDate?: Date;
}

export class DigestPipeline {
  constructor(
    private readonly store: AppStore,
    private readonly summarizer: NewsSummarizer,
    private readonly smsClient: SmsClient
  ) {}

  async run(options: DigestPipelineOptions): Promise<Digest> {
    const rawArticles = (
      await Promise.all(
        options.sources.map(async (source) => {
          try {
            return await createAdapter(source).fetch(source);
          } catch (error) {
            console.warn(
              `[sources] ${source.name} (${source.id}) failed; continuing without it.`,
              error
            );
            return [];
          }
        })
      )
    ).flat();

    const articles = rawArticles.map(normalizeArticle);
    await this.store.saveArticles(articles);

    const preferences = await this.store.getPreferences();
    const digestDate = options.digestDate ?? new Date();
    const clusters = selectCategoryBalancedClusters(
      rankClusters(dedupeArticles(articles), preferences, digestDate),
      { maxItems: options.maxItems, date: digestDate }
    );
    await this.store.saveClusters(clusters);

    const digestId = randomUUID();
    const items = await this.summarizer.summarize(clusters);
    const digest: Digest = {
      id: digestId,
      createdAt: digestDate,
      items,
      smsBody: buildDigestSms(digestId, items, options.publicBaseUrl)
    };

    await this.store.saveDigest(digest);

    if (options.smsTo && options.smsFrom) {
      await this.smsClient.sendSms({
        to: options.smsTo,
        from: options.smsFrom,
        body: digest.smsBody
      });
    }

    return digest;
  }
}
