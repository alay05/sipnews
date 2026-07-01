import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { SourceConfig } from "@sms-news/core";

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

export interface WorkerEnv {
  databaseUrl?: string;
  sourcesConfigPath: string;
  publicBaseUrl: string;
  emailFrom?: string;
  sendgridApiKey?: string;
  sourceFetchTimeoutMs: number;
  maxArticleAgeDays: number;
  openAiApiKey?: string;
  openAiModel: string;
  summaryPromptVersion: string;
}

export function loadWorkerEnv(env: NodeJS.ProcessEnv = process.env): WorkerEnv {
  return {
    databaseUrl: env.DATABASE_URL,
    sourcesConfigPath: env.SOURCES_CONFIG_PATH ?? "config/sources.json",
    publicBaseUrl: env.PUBLIC_BASE_URL ?? "http://localhost:3000",
    emailFrom: env.DIGEST_EMAIL_FROM,
    sendgridApiKey: env.SENDGRID_API_KEY,
    sourceFetchTimeoutMs: parsePositiveInteger(env.SOURCE_FETCH_TIMEOUT_MS, 15000),
    maxArticleAgeDays: parsePositiveInteger(env.MAX_ARTICLE_AGE_DAYS, 7),
    openAiApiKey: env.OPENAI_API_KEY,
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
