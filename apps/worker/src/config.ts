import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { SourceConfig } from "@sipnews/core";

const sourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["rss", "newsapi", "guardian", "gdelt", "openai_web_search"]),
  enabled: z.boolean().default(true),
  priority: z.number().min(0).max(1).default(0.5),
  url: z.string().url().optional(),
  topics: z.array(z.string().min(1)).default([]),
  config: z.record(z.unknown()).optional()
});

const sourcesFileSchema = z.object({
  sources: z.array(sourceSchema)
});

const defaultSourcesConfigPath = "../../config/sources.json";

export interface WorkerEnv {
  databaseUrl: string;
  sourcesConfigPath: string;
  publicBaseUrl: string;
  emailFrom: string;
  sendgridApiKey: string;
  sourceFetchTimeoutMs: number;
  maxArticleAgeDays: number;
  openAiApiKey: string;
  openAiModel: string;
  summaryPromptVersion: string;
}

export function loadWorkerEnv(env: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const databaseUrl = requiredValue(env.DATABASE_URL, "DATABASE_URL");
  const emailFrom = requiredValue(env.DIGEST_EMAIL_FROM, "DIGEST_EMAIL_FROM");
  const sendgridApiKey = requiredValue(env.SENDGRID_API_KEY, "SENDGRID_API_KEY");
  const openAiApiKey = requiredValue(env.OPENAI_API_KEY, "OPENAI_API_KEY");
  return {
    databaseUrl,
    sourcesConfigPath: env.SOURCES_CONFIG_PATH ?? defaultSourcesConfigPath,
    publicBaseUrl: env.PUBLIC_BASE_URL ?? "http://localhost:3000",
    emailFrom,
    sendgridApiKey,
    sourceFetchTimeoutMs: parsePositiveInteger(env.SOURCE_FETCH_TIMEOUT_MS, 15000),
    maxArticleAgeDays: parsePositiveInteger(env.MAX_ARTICLE_AGE_DAYS, 7),
    openAiApiKey,
    openAiModel: env.OPENAI_MODEL ?? "gpt-4.1-mini",
    summaryPromptVersion: env.SUMMARY_PROMPT_VERSION ?? "worker-v1"
  };
}

export async function loadSourcesConfig(path: string): Promise<SourceConfig[]> {
  const raw = await readFile(path, "utf8");
  const parsed = sourcesFileSchema.parse(JSON.parse(raw));
  return parsed.sources.filter((source) => source.enabled);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function requiredValue(value: string | undefined, key: string): string {
  if (!value) throw new Error(`${key} is required`);
  return value;
}
