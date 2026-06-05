import { Router } from "express";
import type { DigestPipeline } from "../services/digestPipeline.js";
import type { AppEnv } from "../config/env.js";
import { loadSourcesConfig } from "../config/sources.js";

export function createJobsRouter(env: AppEnv, pipeline: DigestPipeline): Router {
  const router = Router();

  router.post("/daily-digest", async (req, res) => {
    if (env.JOB_SECRET && req.header("x-job-secret") !== env.JOB_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const sources = await loadSourcesConfig(env.SOURCES_CONFIG_PATH);
    const digest = await pipeline.run({
      sources,
      maxItems: 5,
      publicBaseUrl: env.PUBLIC_BASE_URL,
      smsTo: env.PERSONAL_PHONE_NUMBER,
      smsFrom: env.TWILIO_FROM_NUMBER
    });

    res.json({ id: digest.id, itemCount: digest.items.length, smsBody: digest.smsBody });
  });

  return router;
}
