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
      summaryModel: env.openAiModel,
      summaryPromptVersion: env.summaryPromptVersion
    });

    const mode = workerMode(process.argv[2]);
    const result =
      mode === "prepare"
        ? await pipeline.prepare()
        : mode === "deliver"
          ? await pipeline.deliver()
          : await pipeline.run();
    console.log(
      JSON.stringify({
        event: "worker_complete",
        mode,
        ingestionRunId: result.ingestionRunId,
        articlesSeen: result.articlesSeen,
        articlesSaved: result.articlesSaved,
        clustersTouched: result.clustersTouched,
        dueUsers: "dueUsers" in result ? result.dueUsers : 0,
        digests:
          "digests" in result
            ? (result as { digests: Array<unknown> }).digests.length
            : 0
      })
    );
  } finally {
    await pool.end();
  }
}

function workerMode(value: string | undefined): "run" | "prepare" | "deliver" {
  if (value === "prepare" || value === "deliver") return value;
  return "run";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
