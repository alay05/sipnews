import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { SourceConfig } from "../types/articles.js";

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

export async function loadSourcesConfig(path: string): Promise<SourceConfig[]> {
  const raw = await readFile(path, "utf8");
  const parsed = sourcesFileSchema.parse(JSON.parse(raw));
  return parsed.sources.filter((source) => source.enabled);
}
