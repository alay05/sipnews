import { loadEnv } from "./config/env.js";
import { loadSourcesConfig } from "./config/sources.js";
import { createSummarizer } from "./services/ai.js";
import { DigestPipeline } from "./services/digestPipeline.js";
import { InMemoryStore } from "./services/store.js";
import { createSmsClient } from "./services/twilio.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const sources = await loadSourcesConfig(env.SOURCES_CONFIG_PATH);

  const pipeline = new DigestPipeline(
    new InMemoryStore(),
    createSummarizer({
      openAiApiKey: env.OPENAI_API_KEY,
      openAiModel: env.OPENAI_MODEL
    }),
    createSmsClient({
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN
    })
  );

  const digest = await pipeline.run({
    sources,
    maxItems: 5,
    publicBaseUrl: env.PUBLIC_BASE_URL,
    smsTo: env.PERSONAL_PHONE_NUMBER,
    smsFrom: env.TWILIO_FROM_NUMBER
  });

  console.log(JSON.stringify({ id: digest.id, itemCount: digest.items.length }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
