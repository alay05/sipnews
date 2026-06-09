import { describe, expect, it } from "vitest";
import { buildDigestEmail } from "../src/core/email.js";
import type { Digest } from "../src/types/articles.js";

describe("email", () => {
  it("builds plain-text and html digest emails", () => {
    const email = buildDigestEmail(digest(), "https://digest.local");

    expect(email.subject).toBe("Daily news digest - 2026-06-05");
    expect(email.text).toContain("1. AI tools ship new coding features");
    expect(email.text).toContain("https://example.com/a");
    expect(email.text).toContain("Text HELP for command options.");
    expect(email.text).not.toContain("Reply by SMS with +2");
    expect(email.text).not.toContain("Read all:");
    expect(email.html).toContain("<h1>Daily news digest</h1>");
    expect(email.html).toContain("<h2>1. AI tools ship new coding features</h2>");
    expect(email.html).toContain('href="https://example.com/a"');
    expect(email.html).toContain("Text HELP for command options.");
    expect(email.html).not.toContain("Read all stories");
    expect(email.html).toContain("These updates matter because");
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
        shortSummary:
          "Several AI coding tools added agentic workflows that can plan, edit, and test changes across larger parts of a codebase. The most important shift is that these tools are moving from autocomplete into task execution, which changes how developers review work and manage quality. These updates matter because they can compress routine implementation time, but they also raise the bar for testing, code review, and clear product specs. For a startup or engineering team, the practical takeaway is to pilot these tools on bounded internal tasks before trusting them with broad production changes.",
        sourceLinks: [{ sourceName: "Source", url: "https://example.com/a" }],
        topics: ["ai", "programming"]
      }
    ]
  };
}
