import { loadEnv } from "./config/env.js";
import { loadSourcesConfig } from "./config/sources.js";
import { configuredPersonalUser } from "./config/user.js";
import { createSummarizer } from "./services/ai.js";
import { createStore } from "./services/createStore.js";
import { DigestPipeline } from "./services/digestPipeline.js";
import { createSmsClient } from "./services/twilio.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const sources = await loadSourcesConfig(env.SOURCES_CONFIG_PATH);
  const user = configuredPersonalUser(env);
  if (!user) {
    throw new Error("PERSONAL_PHONE_NUMBER is required to run a digest");
  }

  const store = createStore(env);
  await store.ensureUser(user);

  const pipeline = new DigestPipeline(
    store,
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
    user,
    sources,
    publicBaseUrl: env.PUBLIC_BASE_URL,
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
