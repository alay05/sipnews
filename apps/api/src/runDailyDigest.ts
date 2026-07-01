import { loadEnv } from "./config/env.js";
import { loadSourcesConfig } from "./config/sources.js";
import { createSummarizer } from "./services/ai.js";
import { createStore } from "./services/createStore.js";
import { DigestPipeline } from "./services/digestPipeline.js";
import { createEmailClient } from "./services/email.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const sources = await loadSourcesConfig(env.SOURCES_CONFIG_PATH);

  const store = createStore(env);
  const users = await store.getActiveUsers();
  if (users.length === 0) {
    throw new Error("No active users found for digest delivery");
  }

  const pipeline = new DigestPipeline(
    store,
    createSummarizer({
      openAiApiKey: env.OPENAI_API_KEY,
      openAiModel: env.OPENAI_MODEL
    }),
    createEmailClient({
      apiKey: env.SENDGRID_API_KEY
    })
  );

  const digests = await Promise.all(
    users.map((user) =>
      pipeline.run({
        user,
        sources,
        publicBaseUrl: env.PUBLIC_BASE_URL,
        emailFrom: env.DIGEST_EMAIL_FROM,
        emailTo: env.DIGEST_EMAIL_TO,
        sendEmail: env.SEND_EMAIL,
        sourceFetchTimeoutMs: env.SOURCE_FETCH_TIMEOUT_MS,
        maxArticleAgeDays: env.MAX_ARTICLE_AGE_DAYS
      })
    )
  );

  console.log(
    JSON.stringify(
      {
        userCount: users.length,
        digests: digests.map((digest) => ({
          id: digest.id,
          userId: digest.userId,
          itemCount: digest.items.length
        }))
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
