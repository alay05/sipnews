import { Router } from "express";
import type { DigestPipeline } from "../services/digestPipeline.js";
import type { AppEnv } from "../config/env.js";
import { loadSourcesConfig } from "../config/sources.js";
import { configuredPersonalUser } from "../config/user.js";
import type { AppStore } from "../services/store.js";

export function createJobsRouter(
  env: AppEnv,
  pipeline: DigestPipeline,
  store: AppStore
): Router {
  const router = Router();

  router.post("/daily-digest", async (req, res) => {
    if (env.JOB_SECRET && req.header("x-job-secret") !== env.JOB_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const sources = await loadSourcesConfig(env.SOURCES_CONFIG_PATH);
    const personalUser = configuredPersonalUser(env);
    if (personalUser) await store.ensureUser(personalUser);

    const users = await store.getActiveUsers();
    const digests = await Promise.all(
      users.map((user) =>
        pipeline.run({
          user,
          sources,
          publicBaseUrl: env.PUBLIC_BASE_URL,
          smsFrom: env.TWILIO_FROM_NUMBER
        })
      )
    );

    res.json({
      userCount: users.length,
      digests: digests.map((digest) => ({
        id: digest.id,
        userId: digest.userId,
        localDate: digest.localDate,
        itemCount: digest.items.length,
        smsBody: digest.smsBody
      }))
    });
  });

  return router;
}
