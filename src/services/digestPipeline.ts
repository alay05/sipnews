import { randomUUID } from "node:crypto";
import { createAdapter } from "../adapters/index.js";
import { buildDigestEmail } from "../core/email.js";
import { buildDigestSms } from "../core/sms.js";
import { dedupeArticles } from "../core/dedupe.js";
import { normalizeArticle } from "../core/normalize.js";
import { rankClusters, selectCategoryBalancedClusters } from "../core/ranking.js";
import type { AppUser, SourceConfig, Digest } from "../types/articles.js";
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
    const existingDigest = await this.store.getDigestForUserDate(
      options.user.id,
      localDate
    );
    if (existingDigest) {
      await this.sendDigestIfNeeded(existingDigest, options);
      return existingDigest;
    }

    logStage(options.requestId, "save_sources", { count: options.sources.length });
    await this.store.saveSources(options.sources);

    logStage(options.requestId, "fetch_sources", { count: options.sources.length });
    const rawArticles = (
      await Promise.all(
        options.sources.map(async (source) => {
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
        })
      )
    ).flat();

    logStage(options.requestId, "normalize_articles", { count: rawArticles.length });
    const articles = rawArticles.map(normalizeArticle);
    await this.store.saveArticles(articles);

    logStage(options.requestId, "rank_clusters", { count: articles.length });
    const preferences = await this.store.getPreferences(options.user.id);
    const clusters = selectCategoryBalancedClusters(
      rankClusters(dedupeArticles(articles), preferences, digestDate),
      { maxItems: options.user.digestMaxItems, date: digestDate }
    );
    await this.store.saveClusters(clusters);

    logStage(options.requestId, "summarize", { count: clusters.length });
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

    logStage(options.requestId, "save_digest", { digestId: digest.id });
    await this.store.saveDigest(digest);
    await this.sendDigestIfNeeded(digest, options);

    return digest;
  }

  private async sendDigestIfNeeded(
    digest: Digest,
    options: DigestPipelineOptions
  ): Promise<void> {
    if (digest.sentAt) return;

    const deliveries: Array<Promise<void>> = [];

    if (options.smsFrom && options.sendSms !== false) {
      logStage(options.requestId, "send_sms", {
        digestId: digest.id,
        userId: options.user.id
      });
      deliveries.push(
        this.smsClient.sendSms({
          to: options.user.phoneNumber,
          from: options.smsFrom,
          body: digest.smsBody
        })
      );
    }

    if (options.sendEmail) {
      if (!options.emailFrom || !options.emailTo) {
        throw new Error("DIGEST_EMAIL_FROM and DIGEST_EMAIL_TO are required for email delivery");
      }

      logStage(options.requestId, "send_email", {
        digestId: digest.id,
        userId: options.user.id
      });
      deliveries.push(
        this.emailClient.sendEmail({
          to: options.emailTo,
          from: options.emailFrom,
          ...buildDigestEmail(digest, options.publicBaseUrl)
        })
      );
    }

    if (deliveries.length === 0) return;

    await Promise.all(deliveries);
    digest.sentAt = new Date();
    await this.store.saveDigest(digest);
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
