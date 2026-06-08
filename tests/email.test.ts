import { describe, expect, it } from "vitest";
import { buildDigestEmail } from "../src/core/email.js";
import type { Digest } from "../src/types/articles.js";

describe("email", () => {
  it("builds plain-text and html digest emails", () => {
    const email = buildDigestEmail(digest(), "https://digest.local");

    expect(email.subject).toBe("Daily news digest - 2026-06-05");
    expect(email.text).toContain("1. AI tools ship new coding features");
    expect(email.text).toContain("https://example.com/a");
    expect(email.html).toContain("<h1>Daily news digest</h1>");
    expect(email.html).toContain("<h2>1. AI tools ship new coding features</h2>");
    expect(email.html).toContain('href="https://example.com/a"');
  });
});

function digest(): Digest {
  return {
    id: "digest-1",
    userId: "personal",
    localDate: "2026-06-05",
    createdAt: new Date("2026-06-05T11:00:00Z"),
    smsBody: "Daily news digest",
    items: [
      {
        index: 1,
        clusterId: "cluster",
        title: "AI tools ship new coding features",
        shortSummary: "Several AI coding tools added agentic workflows.",
        sourceLinks: [{ sourceName: "Source", url: "https://example.com/a" }],
        topics: ["ai", "programming"]
      }
    ]
  };
}
