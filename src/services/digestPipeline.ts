import { randomUUID } from "node:crypto";
import { createAdapter } from "../adapters/index.js";
import { buildDigestSms } from "../core/sms.js";
import { dedupeArticles } from "../core/dedupe.js";
import { normalizeArticle } from "../core/normalize.js";
import { rankClusters, selectCategoryBalancedClusters } from "../core/ranking.js";
import type { AppUser, SourceConfig, Digest } from "../types/articles.js";
import type { NewsSummarizer } from "./ai.js";
import type { SmsClient } from "./twilio.js";
import type { AppStore } from "./store.js";

export interface DigestPipelineOptions {
  user: AppUser;
  sources: SourceConfig[];
  publicBaseUrl: string;
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
    const digestDate = options.digestDate ?? new Date();
    const localDate = getLocalDate(digestDate, options.user.timezone);
    const existingDigest = await this.store.getDigestForUserDate(
      options.user.id,
      localDate
    );
    if (existingDigest) return existingDigest;

    await this.store.saveSources(options.sources);

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

    const preferences = await this.store.getPreferences(options.user.id);
    const clusters = selectCategoryBalancedClusters(
      rankClusters(dedupeArticles(articles), preferences, digestDate),
      { maxItems: options.user.digestMaxItems, date: digestDate }
    );
    await this.store.saveClusters(clusters);

    const digestId = randomUUID();
    const items = await this.summarizer.summarize(clusters);
    const digest: Digest = {
      id: digestId,
      userId: options.user.id,
      localDate,
      createdAt: digestDate,
      items,
      recipientPhone: options.user.phoneNumber,
      smsBody: buildDigestSms(digestId, items, options.publicBaseUrl)
    };

    if (options.smsFrom) {
      await this.smsClient.sendSms({
        to: options.user.phoneNumber,
        from: options.smsFrom,
        body: digest.smsBody
      });
      digest.sentAt = new Date();
    }

    await this.store.saveDigest(digest);

    return digest;
  }
}

export function getLocalDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to derive local date for timezone ${timezone}`);
  }

  return `${year}-${month}-${day}`;
}
