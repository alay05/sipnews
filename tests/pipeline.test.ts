import { describe, expect, it } from "vitest";
import { DigestPipeline, withTimeout } from "../src/services/digestPipeline.js";
import { InMemoryStore } from "../src/services/store.js";
import type { AppUser, StoryCluster } from "../src/types/articles.js";
import type { NewsSummarizer } from "../src/services/ai.js";
import type { EmailClient } from "../src/services/email.js";

describe("DigestPipeline", () => {
  it("is idempotent by user and local date", async () => {
    const store = new InMemoryStore();
    const user = appUser();
    await store.ensureUser(user);

    const emailClient = new RecordingEmailClient();
    const pipeline = new DigestPipeline(store, new EmptySummarizer(), emailClient);

    const first = await pipeline.run({
      user,
      sources: [],
      publicBaseUrl: "https://digest.example",
      sendEmail: true,
      emailFrom: "digest@example.com",
      emailTo: "andrew@example.com",
      digestDate: new Date("2026-06-05T11:00:00Z")
    });
    const second = await pipeline.run({
      user,
      sources: [],
      publicBaseUrl: "https://digest.example",
      sendEmail: true,
      emailFrom: "digest@example.com",
      emailTo: "andrew@example.com",
      digestDate: new Date("2026-06-05T15:00:00Z")
    });

    expect(second.id).toBe(first.id);
    expect(emailClient.sentSubjects).toHaveLength(1);
  });

  it("does not resend an already sent digest", async () => {
    const store = new InMemoryStore();
    const user = appUser();
    await store.ensureUser(user);

    const emailClient = new RecordingEmailClient();
    const pipeline = new DigestPipeline(store, new EmptySummarizer(), emailClient);

    await pipeline.run({
      user,
      sources: [],
      publicBaseUrl: "https://digest.example",
      sendEmail: true,
      emailFrom: "digest@example.com",
      emailTo: "andrew@example.com",
      digestDate: new Date("2026-06-05T11:00:00Z")
    });
    await pipeline.run({
      user,
      sources: [],
      publicBaseUrl: "https://digest.example",
      sendEmail: true,
      emailFrom: "digest@example.com",
      emailTo: "andrew@example.com",
      digestDate: new Date("2026-06-05T15:00:00Z")
    });

    expect(emailClient.sentSubjects).toHaveLength(1);
  });

  it("can skip email while still creating the digest", async () => {
    const store = new InMemoryStore();
    const user = appUser();
    await store.ensureUser(user);

    const emailClient = new RecordingEmailClient();
    const pipeline = new DigestPipeline(store, new EmptySummarizer(), emailClient);

    const digest = await pipeline.run({
      user,
      sources: [],
      publicBaseUrl: "https://digest.example",
      sendEmail: false,
      digestDate: new Date("2026-06-05T11:00:00Z")
    });

    expect(digest.sentAt).toBeUndefined();
    expect(emailClient.sentSubjects).toHaveLength(0);
  });

  it("can deliver an existing same-day digest by email once", async () => {
    const store = new InMemoryStore();
    const user = appUser();
    await store.ensureUser(user);

    const emailClient = new RecordingEmailClient();
    const pipeline = new DigestPipeline(store, new EmptySummarizer(), emailClient);

    const first = await pipeline.run({
      user,
      sources: [],
      publicBaseUrl: "https://digest.example",
      sendEmail: true,
      emailFrom: "digest@example.com",
      emailTo: "andrew@example.com",
      digestDate: new Date("2026-06-05T11:00:00Z")
    });
    const second = await pipeline.run({
      user,
      sources: [],
      publicBaseUrl: "https://digest.example",
      sendEmail: true,
      emailFrom: "digest@example.com",
      emailTo: "andrew@example.com",
      digestDate: new Date("2026-06-05T15:00:00Z")
    });

    expect(second.id).toBe(first.id);
    expect(second.sentAt).toBeInstanceOf(Date);
    expect(emailClient.sentSubjects).toHaveLength(1);
  });
});

describe("withTimeout", () => {
  it("rejects slow work with the provided message", async () => {
    await expect(
      withTimeout(
        new Promise((resolve) => setTimeout(resolve, 50)),
        1,
        "source timed out"
      )
    ).rejects.toThrow("source timed out");
  });
});

class EmptySummarizer implements NewsSummarizer {
  async summarize(_clusters: StoryCluster[]) {
    return [];
  }
}

class RecordingEmailClient implements EmailClient {
  readonly sentSubjects: string[] = [];

  async sendEmail(message: { subject: string }): Promise<void> {
    this.sentSubjects.push(message.subject);
  }
}

function appUser(): AppUser {
  return {
    id: "personal",
    phoneNumber: "+15550000001",
    timezone: "America/New_York",
    sendHour: 7,
    digestMaxItems: 5,
    isActive: true
  };
}
