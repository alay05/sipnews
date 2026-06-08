import { describe, expect, it } from "vitest";
import { parseFeedbackCommand } from "../src/core/feedback.js";
import {
  feedbackContextForDigestItem,
  saveFeedbackAndPreferences
} from "../src/services/feedbackService.js";
import { InMemoryStore } from "../src/services/store.js";
import type { DigestItem } from "../src/types/articles.js";

describe("feedback service", () => {
  it("builds digest item context for feedback", () => {
    expect(feedbackContextForDigestItem(digestItem())).toEqual({
      itemIndex: 1,
      topic: "ai",
      topics: ["ai", "programming"],
      sourceName: "Source"
    });
  });

  it("saves feedback and updates preferences together", async () => {
    const store = new InMemoryStore();
    await store.ensureUser({
      id: "personal",
      phoneNumber: "+15550000001",
      timezone: "America/New_York",
      sendHour: 7,
      digestMaxItems: 5,
      isActive: true
    });

    await saveFeedbackAndPreferences(store, "personal", parseFeedbackCommand("+1"), {
      ...feedbackContextForDigestItem(digestItem()),
      digestId: "digest-1"
    });

    const preferences = await store.getPreferences("personal");
    expect(preferences.topicWeights.ai).toBe(0.15);
    expect(preferences.topicWeights.programming).toBe(0.15);
    expect(preferences.sourceWeights.Source).toBe(0.15);
  });
});

function digestItem(): DigestItem {
  return {
    index: 1,
    clusterId: "cluster",
    title: "AI tools ship new coding features",
    shortSummary: "Several AI coding tools added agentic workflows.",
    sourceLinks: [{ sourceName: "Source", url: "https://example.com/a" }],
    topics: ["ai", "programming"]
  };
}
