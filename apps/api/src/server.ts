import express from "express";
import { createSummarizer } from "./services/ai.js";
import { DigestPipeline } from "./services/digestPipeline.js";
import { InMemoryStore, type AppStore } from "./services/store.js";
import { createEmailClient } from "./services/email.js";
import { createDigestRouter } from "./routes/digests.js";
import { createJobsRouter } from "./routes/jobs.js";
import type { AppEnv } from "./config/env.js";

export function buildApp(env: AppEnv, store: AppStore = new InMemoryStore()) {
  const app = express();
  app.use(express.json());

  const summarizer = createSummarizer({
    openAiApiKey: env.OPENAI_API_KEY,
    openAiModel: env.OPENAI_MODEL
  });
  const emailClient = createEmailClient({
    apiKey: env.SENDGRID_API_KEY
  });
  const pipeline = new DigestPipeline(store, summarizer, emailClient);

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/", createDigestRouter(store, env.FEEDBACK_SECRET));
  app.use("/jobs", createJobsRouter(env, pipeline, store));

  return app;
}
