import { createSourceAdapter } from "./adapters.js";
import { loadSourcesConfig, loadWorkerEnv } from "./config.js";
import { createEmailClient } from "./email.js";
import { BucketedWorkerPipeline } from "./pipeline.js";
import { createClusterSummarizer } from "./summarizer.js";
import {
  createDataPool,
  PgContentRepository,
  PgDigestRepository,
  PgRunRepository,
  PgUserRepository
} from "@sms-news/data";

export async function main(): Promise<void> {
  const env = loadWorkerEnv();
  if (!env.databaseUrl) throw new Error("DATABASE_URL is required for the worker");
  if (!env.emailFrom) throw new Error("DIGEST_EMAIL_FROM is required for email delivery");

  const pool = createDataPool(env.databaseUrl);
  try {
    const sources = await loadSourcesConfig(env.sourcesConfigPath);
    const repositories = {
      users: new PgUserRepository(pool),
      content: new PgContentRepository(pool),
      digests: new PgDigestRepository(pool),
      runs: new PgRunRepository(pool)
    };

    const pipeline = new BucketedWorkerPipeline({
      repositories,
      sources,
      adapterForSource: createSourceAdapter,
      summarizer: createClusterSummarizer({
        openAiApiKey: env.openAiApiKey,
        openAiModel: env.openAiModel
      }),
      emailClient: createEmailClient({ apiKey: env.sendgridApiKey }),
      emailFrom: env.emailFrom,
      publicBaseUrl: env.publicBaseUrl,
      sourceFetchTimeoutMs: env.sourceFetchTimeoutMs,
      maxArticleAgeDays: env.maxArticleAgeDays,
      summaryModel: env.openAiApiKey ? env.openAiModel : "heuristic",
      summaryPromptVersion: env.summaryPromptVersion
    });

    const result = await pipeline.run();
    console.log(
      JSON.stringify({
        event: "worker_complete",
        ingestionRunId: result.ingestionRunId,
        articlesSeen: result.articlesSeen,
        articlesSaved: result.articlesSaved,
        clustersTouched: result.clustersTouched,
        dueUsers: result.dueUsers,
        digests: result.digests.length
      })
    );
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
