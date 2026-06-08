import { describe, expect, it } from "vitest";
import { HELP_RESPONSE } from "../src/core/commands.js";
import { replyFor } from "../src/routes/twilio.js";

describe("twilio replies", () => {
  it("sends all command options for HELP", () => {
    const reply = replyFor("help");

    expect(reply).toBe(HELP_RESPONSE);
    expect(reply).toContain("+2 likes story 2");
    expect(reply).toContain("-3 dislikes story 3");
    expect(reply).toContain("more AI boosts a topic");
    expect(reply).toContain("STOP pauses digests");
  });
});
