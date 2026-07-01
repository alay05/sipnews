import { randomUUID } from "node:crypto";
import {
  createDataPool,
  createPgRepositories,
  formatPgDate,
  type DataRepositories,
  type DatabaseClient,
  type DigestRecord
} from "@sms-news/data";
import type { AppEnv } from "../config/env.js";

export interface ProductDataAccess {
  repositories: DataRepositories;
  listDigestsForUser(userId: string): Promise<DigestRecord[]>;
  saveFeedback(input: {
    userId: string;
    digest: DigestRecord;
    itemIndex: number;
    sentiment: "like" | "dislike";
  }): Promise<boolean>;
}

export function createProductDataAccess(env: AppEnv): ProductDataAccess {
  const db = createDataPool(env.DATABASE_URL);
  return {
    repositories: createPgRepositories(db),
    listDigestsForUser: (userId) => listDigestsForUser(db, userId),
    saveFeedback: (input) => saveFeedback(db, input)
  };
}

async function listDigestsForUser(
  db: DatabaseClient,
  userId: string
): Promise<DigestRecord[]> {
  const result = await db.query(
    `SELECT id FROM digests
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );

  const digests = await Promise.all(
    result.rows.map((row) => repositoriesFor(db).digests.getDigest(String(row.id)))
  );
  return digests.filter((digest: DigestRecord | undefined): digest is DigestRecord => Boolean(digest));
}

async function saveFeedback(
  db: DatabaseClient,
  input: {
    userId: string;
    digest: DigestRecord;
    itemIndex: number;
    sentiment: "like" | "dislike";
  }
): Promise<boolean> {
  const item = input.digest.items.find((candidate) => candidate.itemIndex === input.itemIndex);
  await db.query(
    `INSERT INTO feedback_events (
      id, user_id, digest_id, digest_item_id, cluster_id, command, sentiment, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      randomUUID(),
      input.userId,
      input.digest.id,
      item?.id ?? null,
      item?.clusterId ?? null,
      input.sentiment,
      input.sentiment,
      JSON.stringify({ itemIndex: input.itemIndex })
    ]
  );
  return true;
}

function repositoriesFor(db: DatabaseClient): DataRepositories {
  return createPgRepositories(db);
}

export function digestCreatedAt(digest: DigestRecord): string {
  return digest.generatedAt.toISOString();
}

export function digestSentAt(digest: DigestRecord): string | undefined {
  return digest.deliveredAt?.toISOString();
}

export function digestLocalDate(digest: DigestRecord): string {
  return formatPgDate(digest.localDate);
}
