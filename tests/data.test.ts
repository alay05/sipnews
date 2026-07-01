import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createInMemoryRepositories, seedDevUser } from "@sms-news/data";
import type {
  ClusterSummary,
  ClusterSummaryVariant,
  DigestRecord
} from "@sms-news/data";

describe("data repositories", () => {
  it("stores users by external auth identity with digest settings", async () => {
    const repositories = createInMemoryRepositories();

    await seedDevUser(repositories, {
      email: "andrew@example.com",
      timezone: "America/Los_Angeles",
      sendHour: 8
    });

    await expect(
      repositories.users.findUserByAuth("dev", "andrew@example.com")
    ).resolves.toMatchObject({
      id: "dev-user",
      email: "andrew@example.com",
      isActive: true
    });
    await expect(
      repositories.users.getDigestSettings("dev-user")
    ).resolves.toMatchObject({
      timezone: "America/Los_Angeles",
      sendHour: 8,
      deliveryChannel: "email",
      categoryCounts: { world: 5, tech: 0, ai: 0, startups: 0 }
    });
  });

  it("stores bucket memberships and latest summary variants for digest assembly", async () => {
    const repositories = createInMemoryRepositories();

    await repositories.content.upsertBucketDefinition({
      id: "markets",
      name: "Markets",
      sortOrder: 2,
      isActive: true,
      rules: { topics: ["business"] }
    });
    await repositories.content.upsertBucketDefinition({
      id: "world",
      name: "World",
      sortOrder: 1,
      isActive: true,
      rules: { topics: ["world"] }
    });
    await repositories.content.assignClusterToBucket({
      clusterId: "cluster-1",
      bucketId: "world",
      confidence: 0.9,
      assignedBy: "test"
    });

    const summary: ClusterSummary = {
      id: "summary-1",
      clusterId: "cluster-1",
      title: "Cluster title",
      summary: "Longer summary",
      sourceLinks: [],
      topics: ["world"]
    };
    const variant: ClusterSummaryVariant = {
      id: "variant-1",
      clusterSummaryId: summary.id,
      clusterId: summary.clusterId,
      variantType: "medium",
      title: "Digest title",
      shortSummary: "Short summary",
      sourceLinks: [],
      topics: ["world"]
    };
    await repositories.content.saveClusterSummary(summary, [variant]);

    await expect(repositories.content.listActiveBuckets()).resolves.toMatchObject([
      { id: "world" },
      { id: "markets" }
    ]);
    await expect(
      repositories.content.listClusterIdsForBucket("world")
    ).resolves.toEqual(["cluster-1"]);
    await expect(
      repositories.content.getLatestSummaryVariant("cluster-1", "medium")
    ).resolves.toMatchObject({ id: "variant-1", shortSummary: "Short summary" });
  });

  it("stores digests by user/date with cluster and summary variant references", async () => {
    const repositories = createInMemoryRepositories();
    const digestA = digest("digest-a", "user-a", "2026-06-30");
    const digestB = digest("digest-b", "user-b", "2026-06-30");

    await repositories.digests.saveDigest(digestA);
    await repositories.digests.saveDigest(digestB);

    await expect(
      repositories.digests.getDigestForUserDate("user-a", "2026-06-30")
    ).resolves.toMatchObject({
      id: "digest-a",
      items: [{ clusterId: "cluster-1", summaryVariantId: "variant-1" }]
    });
    await expect(
      repositories.digests.getDigestForUserDate("user-b", "2026-06-30")
    ).resolves.toMatchObject({ id: "digest-b" });
  });

});

describe("canonical schema", () => {
  it("omits SMS-only and vector columns from the final init migration", () => {
    const migration = readFileSync(join(process.cwd(), "migrations/001_init.sql"), "utf8");

    expect(migration).not.toMatch(/\bphone_number\b/);
    expect(migration).not.toMatch(/\bsms_body\b/);
    expect(migration).not.toMatch(/\brecipient_phone\b/);
    expect(migration).not.toMatch(/\bembedding\b/);
    expect(migration).not.toMatch(/\bpreference_embedding\b/);
  });
});

function digest(id: string, userId: string, localDate: string): DigestRecord {
  return {
    id,
    userId,
    localDate,
    status: "draft",
    generatedAt: new Date("2026-06-30T12:00:00Z"),
    items: [
      {
        id: `${id}-item-1`,
        digestId: id,
        clusterId: "cluster-1",
        summaryVariantId: "variant-1",
        bucketId: "world",
        itemIndex: 0,
        titleSnapshot: "Digest title",
        summarySnapshot: "Short summary",
        sourceLinksSnapshot: [],
        topicsSnapshot: ["world"]
      }
    ]
  };
}
