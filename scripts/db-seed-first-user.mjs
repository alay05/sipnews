import "dotenv/config";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (process.env.DATABASE_ENV !== "development") {
  throw new Error("db:seed:first-user only supports DATABASE_ENV=development");
}

if (process.env.DATABASE_RESET_ALLOWED !== "true") {
  throw new Error("db:seed:first-user requires DATABASE_RESET_ALLOWED=true");
}

const email = process.env.FIRST_USER_EMAIL ?? "andrewlay05@gmail.com";
const displayName = process.env.FIRST_USER_DISPLAY_NAME ?? "Andrew";
const timezone = process.env.FIRST_USER_TIMEZONE ?? "America/New_York";
const sendHour = Number.parseInt(process.env.FIRST_USER_SEND_HOUR ?? "7", 10);
const digestMaxItems = Number.parseInt(process.env.FIRST_USER_DIGEST_MAX_ITEMS ?? "10", 10);
const summaryLength = process.env.FIRST_USER_SUMMARY_LENGTH ?? "medium";
const categoryCounts = parseCounts(
  process.env.FIRST_USER_CATEGORY_COUNTS ?? "world=2,tech=4,ai=3,startups=1",
  digestMaxItems
);

const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query("BEGIN");
  await pool.query(`DELETE FROM delivery_runs`);
  await pool.query(`DELETE FROM feedback_events`);
  await pool.query(`DELETE FROM digest_items`);
  await pool.query(`DELETE FROM digests`);
  await pool.query(`DELETE FROM cluster_summary_variants`);
  await pool.query(`DELETE FROM cluster_summaries`);
  await pool.query(`DELETE FROM cluster_bucket_memberships`);
  await pool.query(`DELETE FROM bucket_definitions`);
  await pool.query(`DELETE FROM story_cluster_articles`);
  await pool.query(`DELETE FROM story_clusters`);
  await pool.query(`DELETE FROM articles`);
  await pool.query(`DELETE FROM sources`);
  await pool.query(`DELETE FROM user_digest_settings`);
  await pool.query(`DELETE FROM users`);

  await pool.query(
    `INSERT INTO users (
      id, external_auth_provider, external_auth_subject, email, display_name, is_active
    ) VALUES ($1, 'clerk', $2, $2, $3, true)`,
    ["user_andrewlay05", email, displayName]
  );

  await pool.query(
    `INSERT INTO user_digest_settings (
      user_id, timezone, send_hour, digest_max_items, summary_length, delivery_channel,
      delivery_address, category_counts, source_weights, muted_sources, preferred_bucket_ids,
      include_bucket_labels
    ) VALUES ($1, $2, $3, $4, $5, 'email', $6, $7::jsonb, '{}'::jsonb, '{}', '{}', true)`,
    [
      "user_andrewlay05",
      timezone,
      sendHour,
      digestMaxItems,
      summaryLength,
      email,
      JSON.stringify(categoryCounts)
    ]
  );

  await pool.query("COMMIT");
  console.log(`[db:seed:first-user] seeded ${email}`);
} catch (error) {
  await pool.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await pool.end();
}

function parseCounts(input, digestMaxItems) {
  const counts = {
    world: 0,
    tech: 0,
    ai: 0,
    startups: 0
  };

  for (const pair of input.split(",")) {
    const [key, rawValue] = pair.split("=").map((value) => value.trim());
    if (!(key in counts)) continue;
    counts[key] = Number.parseInt(rawValue ?? "0", 10) || 0;
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total !== digestMaxItems) {
    throw new Error(
      `FIRST_USER_CATEGORY_COUNTS must sum to ${digestMaxItems}; received ${total}`
    );
  }

  return counts;
}
