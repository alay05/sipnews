import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { DigestPipeline } from "../services/digestPipeline.js";
import type { AppEnv } from "../config/env.js";
import { loadSourcesConfig } from "../config/sources.js";
import { configuredPersonalUser } from "../config/user.js";
import type { SourceConfig } from "../types/articles.js";
import type { AppStore } from "../services/store.js";

export function createJobsRouter(
  env: AppEnv,
  pipeline: DigestPipeline,
  store: AppStore
): Router {
  const router = Router();

  router.post("/daily-digest", async (req, res) => {
    const requestId = randomUUID();
    if (env.JOB_SECRET && req.header("x-job-secret") !== env.JOB_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      logJobStage(requestId, "load_sources");
      const sources = filterSources(await loadSourcesConfig(env.SOURCES_CONFIG_PATH), env);

      logJobStage(requestId, "seed_user");
      const personalUser = configuredPersonalUser(env);
      if (personalUser) await store.ensureUser(personalUser);

      logJobStage(requestId, "load_users");
      const users = await store.getActiveUsers();

      logJobStage(requestId, "run_pipeline", {
        userCount: users.length,
        sourceCount: sources.length,
        sendSms: env.SEND_SMS
      });
      const digests = await Promise.all(
        users.map((user) =>
          pipeline.run({
            user,
            sources,
            publicBaseUrl: env.PUBLIC_BASE_URL,
            smsFrom: env.TWILIO_FROM_NUMBER,
            sendSms: env.SEND_SMS,
            sourceFetchTimeoutMs: env.SOURCE_FETCH_TIMEOUT_MS,
            requestId
          })
        )
      );

      res.json({
        requestId,
        userCount: users.length,
        digests: digests.map((digest) => ({
          id: digest.id,
          userId: digest.userId,
          localDate: digest.localDate,
          itemCount: digest.items.length,
          sentAt: digest.sentAt,
          smsBody: digest.smsBody
        }))
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "daily_digest_error",
          requestId,
          error: serializeError(error)
        })
      );
      res.status(500).json(dailyDigestErrorResponse(requestId, error));
    }
  });

  return router;
}

export function filterSources(sources: SourceConfig[], env: AppEnv): SourceConfig[] {
  if (!env.DISABLE_GDELT) return sources;
  return sources.filter((source) => source.type !== "gdelt");
}

function logJobStage(
  requestId: string,
  stage: string,
  detail: Record<string, unknown> = {}
): void {
  console.log(
    JSON.stringify({
      event: "daily_digest_job_stage",
      requestId,
      stage,
      ...detail
    })
  );
}

export function dailyDigestErrorResponse(
  requestId: string,
  error: unknown
): { error: string; requestId: string; detail: string } {
  return {
    error: "Daily digest failed",
    requestId,
    detail: error instanceof Error ? error.message : String(error)
  };
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return { message: String(error) };
}
