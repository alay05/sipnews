import { createSourceAdapter } from "./adapters.js";
import { loadSourcesConfig, loadWorkerEnv, type WorkerMode } from "./config.js";
import { ConsoleEmailClient, createEmailClient } from "./email.js";
import { BucketedWorkerPipeline } from "./pipeline.js";
import { createClusterSummarizer } from "./summarizer.js";
import {
  createDataPool,
  PgContentRepository,
  PgDigestRepository,
  PgRunRepository,
  PgUserRepository
} from "@sipnews/data";

export async function main(): Promise<void> {
  const mode = workerMode(process.argv[2]);
  const env = loadWorkerEnv(mode);

  const pool = createDataPool(env.databaseUrl);
  try {
    const sources = mode === "deliver" ? [] : await loadSourcesConfig(env.sourcesConfigPath);
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
      summarizer:
        mode === "deliver"
          ? unavailableSummarizer()
          : createClusterSummarizer({
              openAiApiKey: requireConfiguredValue(env.openAiApiKey, "OPENAI_API_KEY"),
              openAiModel: env.openAiModel
            }),
      emailClient:
        mode === "prepare"
          ? new ConsoleEmailClient()
          : createEmailClient({
              apiKey: requireConfiguredValue(env.sendgridApiKey, "SENDGRID_API_KEY")
            }),
      emailFrom: env.emailFrom ?? "prepare-only@example.invalid",
      publicBaseUrl: env.publicBaseUrl ?? "http://localhost:3000",
      sourceFetchTimeoutMs: env.sourceFetchTimeoutMs,
      maxArticleAgeDays: env.maxArticleAgeDays,
      summaryModel: env.openAiModel,
      summaryPromptVersion: env.summaryPromptVersion
    });

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

function workerMode(value: string | undefined): WorkerMode {
  if (value === "prepare" || value === "deliver") return value;
  return "run";
}

function unavailableSummarizer() {
  return {
    async summarize() {
      throw new Error("Summarizer is not available in deliver-only worker mode");
    }
  };
}

function requireConfiguredValue(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`${key} is required for this worker mode`);
  }
  return value;
}
