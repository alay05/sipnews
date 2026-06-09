import { describe, expect, it } from "vitest";
import { buildDigestSms, enforceSmsLength } from "../src/core/sms.js";

describe("sms", () => {
  it("builds digest SMS with reply instructions", () => {
    const body = buildDigestSms(
      "digest-1",
      [
        {
          index: 1,
          clusterId: "cluster",
          title: "AI tools ship new coding features",
          shortSummary: "Several AI coding tools added agentic workflows.",
          sourceLinks: [{ sourceName: "Source", url: "https://example.com/a" }],
          topics: ["ai", "programming"]
        }
      ],
      "https://digest.local"
    );

    expect(body).toContain("Text HELP for command options.");
    expect(body).not.toContain("Reply +2");
    expect(body).toContain("https://example.com/a");
    expect(body).toContain("*1. AI tools ship new coding features*");
    expect(body).toContain("\n\n");
  });

  it("caps long SMS bodies", () => {
    expect(enforceSmsLength("x".repeat(2000)).length).toBeLessThanOrEqual(1450);
  });

});
