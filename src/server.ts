import express from "express";
import { createSummarizer } from "./services/ai.js";
import { DigestPipeline } from "./services/digestPipeline.js";
import { InMemoryStore, type AppStore } from "./services/store.js";
import { createSmsClient } from "./services/twilio.js";
import { createDigestRouter } from "./routes/digests.js";
import { createJobsRouter } from "./routes/jobs.js";
import { createTwilioRouter } from "./routes/twilio.js";
import type { AppEnv } from "./config/env.js";

export function buildApp(env: AppEnv, store: AppStore = new InMemoryStore()) {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  const summarizer = createSummarizer({
    openAiApiKey: env.OPENAI_API_KEY,
    openAiModel: env.OPENAI_MODEL
  });
  const smsClient = createSmsClient({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN
  });
  const pipeline = new DigestPipeline(store, summarizer, smsClient);

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/webhooks/twilio", createTwilioRouter(store, env));
  app.use("/", createDigestRouter(store, env.FEEDBACK_SECRET));
  app.use("/jobs", createJobsRouter(env, pipeline, store));

  return app;
}
