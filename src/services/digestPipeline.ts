import { randomUUID } from "node:crypto";
import { createAdapter } from "../adapters/index.js";
import { buildDigestSms } from "../core/sms.js";
import { dedupeArticles } from "../core/dedupe.js";
import { normalizeArticle } from "../core/normalize.js";
import { rankClusters } from "../core/ranking.js";
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
        options.sources.map((source) => createAdapter(source).fetch(source))
      )
    ).flat();

    const articles = rawArticles.map(normalizeArticle);
    await this.store.saveArticles(articles);

    const preferences = await this.store.getPreferences();
    const clusters = rankClusters(dedupeArticles(articles), preferences).slice(
      0,
      options.maxItems
    );
    await this.store.saveClusters(clusters);

    const digestId = randomUUID();
    const items = await this.summarizer.summarize(clusters);
    const digest: Digest = {
      id: digestId,
      createdAt: new Date(),
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
