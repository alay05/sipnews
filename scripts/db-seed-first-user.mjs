import "dotenv/config";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { requireEnv, requireEnvValue } from "./db-lib.mjs";

const databaseUrl = requireEnv("DATABASE_URL");
requireEnvValue("DATABASE_ENV", "development");
requireEnvValue("DATABASE_BOOTSTRAP_ALLOWED", "true");

const email = normalizeEmail(requireEnv("FIRST_USER_EMAIL"));
const displayName = requireEnv("FIRST_USER_DISPLAY_NAME");
const timezone = requireEnv("FIRST_USER_TIMEZONE");
const sendHour = parseIntegerEnv("FIRST_USER_SEND_HOUR");
const digestMaxItems = parseIntegerEnv("FIRST_USER_DIGEST_MAX_ITEMS");
const summaryLength = parseSummaryLength(requireEnv("FIRST_USER_SUMMARY_LENGTH"));
const categoryCounts = parseCounts(requireEnv("FIRST_USER_CATEGORY_COUNTS"), digestMaxItems);

const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query("BEGIN");
  const existingUserId = await findExistingUserIdByEmail(pool, email);
  const userId = existingUserId ?? seededUserId(email);

  await pool.query(
    `INSERT INTO users (
      id, external_auth_provider, external_auth_subject, email, display_name, is_active
    ) VALUES ($1, 'clerk', $2, $2, $3, true)
    ON CONFLICT (id) DO UPDATE SET
      external_auth_provider = EXCLUDED.external_auth_provider,
      external_auth_subject = EXCLUDED.external_auth_subject,
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      is_active = EXCLUDED.is_active,
      updated_at = now()`,
    [userId, email, displayName]
  );

  await pool.query(
    `INSERT INTO user_digest_settings (
      user_id, timezone, send_hour, digest_max_items, summary_length, delivery_channel,
      delivery_address, category_counts, source_weights, muted_sources, preferred_bucket_ids,
      include_bucket_labels
    ) VALUES ($1, $2, $3, $4, $5, 'email', $6, $7::jsonb, '{}'::jsonb, '{}', '{}', true)
    ON CONFLICT (user_id) DO UPDATE SET
      timezone = EXCLUDED.timezone,
      send_hour = EXCLUDED.send_hour,
      digest_max_items = EXCLUDED.digest_max_items,
      summary_length = EXCLUDED.summary_length,
      delivery_channel = EXCLUDED.delivery_channel,
      delivery_address = EXCLUDED.delivery_address,
      category_counts = EXCLUDED.category_counts,
      source_weights = EXCLUDED.source_weights,
      muted_sources = EXCLUDED.muted_sources,
      preferred_bucket_ids = EXCLUDED.preferred_bucket_ids,
      include_bucket_labels = EXCLUDED.include_bucket_labels,
      updated_at = now()`,
    [
      userId,
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

async function findExistingUserIdByEmail(pool, email) {
  const result = await pool.query(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  return result.rows[0] ? String(result.rows[0].id) : undefined;
}

function seededUserId(email) {
  return `user_${createHash("sha256").update(`seed:${email}`).digest("hex").slice(0, 16)}`;
}

function normalizeEmail(value) {
  const email = value.trim().toLowerCase();
  if (!email) {
    throw new Error("FIRST_USER_EMAIL must not be empty");
  }
  return email;
}

function parseIntegerEnv(name) {
  const parsed = Number.parseInt(requireEnv(name), 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  return parsed;
}

function parseSummaryLength(value) {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }
  throw new Error(`FIRST_USER_SUMMARY_LENGTH must be one of small, medium, large; received ${value}`);
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
