import { describe, expect, it } from "vitest";
import {
  dailyDigestErrorResponse,
  filterSources
} from "../src/routes/jobs.js";
import type { AppEnv } from "../src/config/env.js";
import type { SourceConfig } from "../src/types/articles.js";

describe("daily digest job helpers", () => {
  it("can disable GDELT sources during production debugging", () => {
    const filtered = filterSources(
      [
        source("rss-source", "rss"),
        source("gdelt-source", "gdelt"),
        source("guardian-source", "guardian")
      ],
      env({ DISABLE_GDELT: true })
    );

    expect(filtered.map((item) => item.id)).toEqual([
      "rss-source",
      "guardian-source"
    ]);
  });

  it("builds structured 500 response bodies", () => {
    expect(dailyDigestErrorResponse("request-1", new Error("database failed"))).toEqual({
      error: "Daily digest failed",
      requestId: "request-1",
      detail: "database failed"
    });
  });
});

function source(id: string, type: SourceConfig["type"]): SourceConfig {
  return {
    id,
    name: id,
    type,
    enabled: true,
    priority: 0.5,
    topics: []
  };
}

function env(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    PORT: 3000,
    PUBLIC_BASE_URL: "http://127.0.0.1:3000",
    SOURCES_CONFIG_PATH: "config/sources.example.json",
    OPENAI_MODEL: "gpt-4.1-mini",
    SOURCE_FETCH_TIMEOUT_MS: 15000,
    MAX_ARTICLE_AGE_DAYS: 7,
    DISABLE_GDELT: false,
    SEND_SMS: false,
    TWILIO_VALIDATE_WEBHOOKS: false,
    SEND_EMAIL: false,
    PERSONAL_USER_ID: "personal",
    PERSONAL_TIMEZONE: "America/New_York",
    DIGEST_SEND_HOUR: 7,
    DIGEST_MAX_ITEMS: 5,
    JOB_SECRET: "secret",
    FEEDBACK_SECRET: "feedback-secret",
    ...overrides
  };
}
