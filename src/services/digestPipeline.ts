import { randomUUID } from "node:crypto";
import { createAdapter } from "../adapters/index.js";
import { buildDigestEmail } from "../core/email.js";
import { buildDigestSms } from "../core/sms.js";
import { dedupeArticles } from "../core/dedupe.js";
import { normalizeArticle } from "../core/normalize.js";
import { rankClusters, selectCategoryBalancedClusters } from "../core/ranking.js";
import { filterRecentArticles } from "../core/recency.js";
import type {
  AppUser,
  Article,
  Digest,
  RawArticle,
  SourceConfig,
  StoryCluster
} from "../types/articles.js";
import type { NewsSummarizer } from "./ai.js";
import { ConsoleEmailClient, type EmailClient } from "./email.js";
import type { SmsClient } from "./twilio.js";
import type { AppStore } from "./store.js";

export interface DigestPipelineOptions {
  user: AppUser;
  sources: SourceConfig[];
  publicBaseUrl: string;
  smsFrom?: string;
  sendSms?: boolean;
  emailFrom?: string;
  emailTo?: string;
  sendEmail?: boolean;
  sourceFetchTimeoutMs?: number;
  maxArticleAgeDays?: number;
  digestDate?: Date;
  requestId?: string;
}

export class DigestPipeline {
  constructor(
    private readonly store: AppStore,
    private readonly summarizer: NewsSummarizer,
    private readonly smsClient: SmsClient,
    private readonly emailClient: EmailClient = new ConsoleEmailClient()
  ) {}

  async run(options: DigestPipelineOptions): Promise<Digest> {
    const digestDate = options.digestDate ?? new Date();
    const localDate = getLocalDate(digestDate, options.user.timezone);
    const existingDigest = await this.store.getDigestForUserDate(options.user.id, localDate);
    if (existingDigest) {
      await this.sendDigestIfNeeded(existingDigest, options);
      return existingDigest;
    }

    logStage(options.requestId, "save_sources", { count: options.sources.length });
    await this.store.saveSources(options.sources);

    const rawArticles = await this.fetchSources(options);

    logStage(options.requestId, "normalize_articles", { count: rawArticles.length });
    const articles = filterRecentArticles(rawArticles.map(normalizeArticle), {
      now: digestDate,
      maxAgeDays: options.maxArticleAgeDays ?? 7
    });
    logStage(options.requestId, "filter_recent_articles", { count: articles.length });
    await this.store.saveArticles(articles);

    const clusters = await this.selectClusters(articles, options, digestDate);
    await this.store.saveClusters(clusters);

    const digest = await this.createDigest(clusters, localDate, digestDate, options);

    logStage(options.requestId, "save_digest", { digestId: digest.id });
    await this.store.saveDigest(digest);
    await this.sendDigestIfNeeded(digest, options);

    return digest;
  }

  private async fetchSources(options: DigestPipelineOptions): Promise<RawArticle[]> {
    logStage(options.requestId, "fetch_sources", { count: options.sources.length });

    const results = await Promise.all(
      options.sources.map((source) => this.fetchSource(source, options))
    );
    return results.flat();
  }

  private async fetchSource(
    source: SourceConfig,
    options: DigestPipelineOptions
  ): Promise<RawArticle[]> {
    try {
      return await withTimeout(
        createAdapter(source).fetch(source),
        options.sourceFetchTimeoutMs ?? 15000,
        `Source ${source.name} (${source.id}) timed out`
      );
    } catch (error) {
      console.warn(
        `[sources] ${source.name} (${source.id}) failed; continuing without it.`,
        error
      );
      return [];
    }
  }

  private async selectClusters(
    articles: Article[],
    options: DigestPipelineOptions,
    digestDate: Date
  ): Promise<StoryCluster[]> {
    logStage(options.requestId, "rank_clusters", { count: articles.length });
    const preferences = await this.store.getPreferences(options.user.id);
    return selectCategoryBalancedClusters(
      rankClusters(dedupeArticles(articles), preferences, digestDate),
      { maxItems: options.user.digestMaxItems, date: digestDate }
    );
  }

  private async createDigest(
    clusters: StoryCluster[],
    localDate: string,
    digestDate: Date,
    options: DigestPipelineOptions
  ): Promise<Digest> {
    logStage(options.requestId, "summarize", { count: clusters.length });
    const digestId = randomUUID();
    const items = await this.summarizer.summarize(clusters);

    return {
      id: digestId,
      userId: options.user.id,
      localDate,
      createdAt: digestDate,
      items,
      recipientPhone: options.user.phoneNumber,
      smsBody: buildDigestSms(digestId, items, options.publicBaseUrl)
    };
  }

  private async sendDigestIfNeeded(
    digest: Digest,
    options: DigestPipelineOptions
  ): Promise<void> {
    if (digest.sentAt) return;

    const deliveries = this.deliveryPromises(digest, options);

    if (deliveries.length === 0) return;

    await Promise.all(deliveries);
    digest.sentAt = new Date();
    await this.store.saveDigest(digest);
  }

  private deliveryPromises(
    digest: Digest,
    options: DigestPipelineOptions
  ): Array<Promise<void>> {
    return [
      this.smsDelivery(digest, options),
      this.emailDelivery(digest, options)
    ].filter((delivery): delivery is Promise<void> => Boolean(delivery));
  }

  private smsDelivery(
    digest: Digest,
    options: DigestPipelineOptions
  ): Promise<void> | undefined {
    if (!options.smsFrom || options.sendSms === false) return undefined;

    logStage(options.requestId, "send_sms", {
      digestId: digest.id,
      userId: options.user.id
    });
    return this.smsClient.sendSms({
      to: options.user.phoneNumber,
      from: options.smsFrom,
      body: digest.smsBody
    });
  }

  private emailDelivery(
    digest: Digest,
    options: DigestPipelineOptions
  ): Promise<void> | undefined {
    if (!options.sendEmail) return undefined;
    if (!options.emailFrom || !options.emailTo) {
      throw new Error("DIGEST_EMAIL_FROM and DIGEST_EMAIL_TO are required for email delivery");
    }

    logStage(options.requestId, "send_email", {
      digestId: digest.id,
      userId: options.user.id
    });
    return this.emailClient.sendEmail({
      to: options.emailTo,
      from: options.emailFrom,
      ...buildDigestEmail(digest, options.publicBaseUrl)
    });
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

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function logStage(
  requestId: string | undefined,
  stage: string,
  detail: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({
      event: "daily_digest_stage",
      requestId,
      stage,
      ...detail
    })
  );
}
