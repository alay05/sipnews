import { describe, expect, it } from "vitest";
import {
  applyFeedback,
  createFeedbackToken,
  parseFeedbackCommand,
  verifyFeedbackToken
} from "../src/core/feedback.js";

describe("feedback", () => {
  it("parses deterministic reply commands", () => {
    expect(parseFeedbackCommand("+2")).toEqual({
      type: "like",
      itemIndex: 2,
      raw: "+2"
    });
    expect(parseFeedbackCommand("less politics")).toEqual({
      type: "less_topic",
      topic: "politics",
      raw: "less politics"
    });
  });

  it("updates topic weights", () => {
    const updated = applyFeedback(
      { topicWeights: {}, sourceWeights: {}, mutedSources: [] },
      parseFeedbackCommand("more AI")
    );

    expect(updated.topicWeights.ai).toBe(0.25);
  });

  it("round trips signed feedback tokens", () => {
    const token = createFeedbackToken(
      { digestId: "digest", itemIndex: 1, sentiment: "like" },
      "secret"
    );

    expect(verifyFeedbackToken(token, "secret")).toEqual({
      digestId: "digest",
      itemIndex: 1,
      sentiment: "like"
    });
  });
});
