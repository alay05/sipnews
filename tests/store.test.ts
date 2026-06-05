import { describe, expect, it } from "vitest";
import { getLocalDate } from "../src/services/digestPipeline.js";
import { InMemoryStore } from "../src/services/store.js";
import type { AppUser, Digest } from "../src/types/articles.js";

describe("user-scoped store behavior", () => {
  it("stores digests separately by user and local date", async () => {
    const store = new InMemoryStore();
    const userA = user("user-a", "+15550000001");
    const userB = user("user-b", "+15550000002");
    await store.ensureUser(userA);
    await store.ensureUser(userB);

    await store.saveDigest(digest("digest-a", userA.id, "2026-06-05"));
    await store.saveDigest(digest("digest-b", userB.id, "2026-06-05"));

    await expect(store.getDigestForUserDate(userA.id, "2026-06-05")).resolves.toMatchObject({
      id: "digest-a",
      userId: userA.id
    });
    await expect(store.getDigestForUserDate(userB.id, "2026-06-05")).resolves.toMatchObject({
      id: "digest-b",
      userId: userB.id
    });
  });
});

describe("local digest dates", () => {
  it("uses the user's timezone for idempotency dates", () => {
    expect(getLocalDate(new Date("2026-06-05T11:00:00Z"), "America/New_York")).toBe(
      "2026-06-05"
    );
    expect(getLocalDate(new Date("2026-06-05T01:00:00Z"), "America/New_York")).toBe(
      "2026-06-04"
    );
  });
});

function user(id: string, phoneNumber: string): AppUser {
  return {
    id,
    phoneNumber,
    timezone: "America/New_York",
    sendHour: 7,
    digestMaxItems: 5,
    isActive: true
  };
}

function digest(id: string, userId: string, localDate: string): Digest {
  return {
    id,
    userId,
    localDate,
    createdAt: new Date("2026-06-05T12:00:00Z"),
    smsBody: "Digest",
    items: []
  };
}
