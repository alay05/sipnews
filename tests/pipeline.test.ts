import { describe, expect, it } from "vitest";
import { DigestPipeline } from "../src/services/digestPipeline.js";
import { InMemoryStore } from "../src/services/store.js";
import type { AppUser, StoryCluster } from "../src/types/articles.js";
import type { NewsSummarizer } from "../src/services/ai.js";
import type { SmsClient } from "../src/services/twilio.js";

describe("DigestPipeline", () => {
  it("is idempotent by user and local date", async () => {
    const store = new InMemoryStore();
    const user = appUser();
    await store.ensureUser(user);

    const smsClient = new RecordingSmsClient();
    const pipeline = new DigestPipeline(store, new EmptySummarizer(), smsClient);

    const first = await pipeline.run({
      user,
      sources: [],
      publicBaseUrl: "https://digest.example",
      smsFrom: "+15550009999",
      digestDate: new Date("2026-06-05T11:00:00Z")
    });
    const second = await pipeline.run({
      user,
      sources: [],
      publicBaseUrl: "https://digest.example",
      smsFrom: "+15550009999",
      digestDate: new Date("2026-06-05T15:00:00Z")
    });

    expect(second.id).toBe(first.id);
    expect(smsClient.sentBodies).toHaveLength(1);
  });
});

class EmptySummarizer implements NewsSummarizer {
  async summarize(_clusters: StoryCluster[]) {
    return [];
  }
}

class RecordingSmsClient implements SmsClient {
  readonly sentBodies: string[] = [];

  async sendSms(message: { body: string }): Promise<void> {
    this.sentBodies.push(message.body);
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
