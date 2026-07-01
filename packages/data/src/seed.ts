import type { DataRepositories } from "./repositories.js";
import type { DataUser, UserDigestSettings } from "./types.js";

export const DEV_USER_ID = "dev-user";
export const DEV_AUTH_PROVIDER = "dev";
export const DEV_AUTH_SUBJECT = "local";

export interface LegacySingleUserSeedInput {
  userId?: string;
  phoneNumber?: string;
  email?: string;
  displayName?: string;
  timezone?: string;
  sendHour?: number;
  digestMaxItems?: number;
  deliveryChannel?: string;
  deliveryAddress?: string;
}

export function devUser(input: LegacySingleUserSeedInput = {}): DataUser {
  return {
    id: input.userId ?? DEV_USER_ID,
    externalAuthProvider: DEV_AUTH_PROVIDER,
    externalAuthSubject: input.email ?? input.phoneNumber ?? DEV_AUTH_SUBJECT,
    email: input.email,
    displayName: input.displayName ?? "Dev User",
    isActive: true
  };
}

export function devDigestSettings(
  input: LegacySingleUserSeedInput = {}
): UserDigestSettings {
  return {
    userId: input.userId ?? DEV_USER_ID,
    timezone: input.timezone ?? "America/New_York",
    sendHour: input.sendHour ?? 7,
    digestMaxItems: input.digestMaxItems ?? 5,
    deliveryChannel: input.deliveryChannel ?? (input.phoneNumber ? "sms" : "email"),
    deliveryAddress: input.deliveryAddress ?? input.email ?? input.phoneNumber,
    topicWeights: {},
    sourceWeights: {},
    mutedSources: [],
    preferredBucketIds: [],
    includeBucketLabels: true
  };
}

export async function seedDevUser(
  repositories: Pick<DataRepositories, "users">,
  input: LegacySingleUserSeedInput = {}
): Promise<DataUser> {
  const user = devUser(input);
  await repositories.users.upsertUser(user);
  await repositories.users.upsertDigestSettings(
    devDigestSettings({ ...input, userId: user.id })
  );
  return user;
}

export function legacySingleUserBackfillSql(input: LegacySingleUserSeedInput = {}): string {
  const user = devUser(input);
  const settings = devDigestSettings({ ...input, userId: user.id });

  return [
    "INSERT INTO users (id, external_auth_provider, external_auth_subject, email, display_name, is_active)",
    `VALUES (${sql(user.id)}, ${sql(user.externalAuthProvider)}, ${sql(user.externalAuthSubject)}, ${sql(user.email)}, ${sql(user.displayName)}, true)`,
    "ON CONFLICT (id) DO UPDATE SET",
    "  external_auth_provider = EXCLUDED.external_auth_provider,",
    "  external_auth_subject = EXCLUDED.external_auth_subject,",
    "  email = EXCLUDED.email,",
    "  display_name = EXCLUDED.display_name,",
    "  is_active = EXCLUDED.is_active,",
    "  updated_at = now();",
    "",
    "INSERT INTO user_digest_settings (",
    "  user_id, timezone, send_hour, digest_max_items, delivery_channel, delivery_address,",
    "  topic_weights, source_weights, muted_sources, preferred_bucket_ids, include_bucket_labels",
    ")",
    `VALUES (${sql(settings.userId)}, ${sql(settings.timezone)}, ${settings.sendHour}, ${settings.digestMaxItems}, ${sql(settings.deliveryChannel)}, ${sql(settings.deliveryAddress)}, '{}', '{}', '{}', '{}', true)`,
    "ON CONFLICT (user_id) DO UPDATE SET",
    "  timezone = EXCLUDED.timezone,",
    "  send_hour = EXCLUDED.send_hour,",
    "  digest_max_items = EXCLUDED.digest_max_items,",
    "  delivery_channel = EXCLUDED.delivery_channel,",
    "  delivery_address = EXCLUDED.delivery_address,",
    "  updated_at = now();"
  ].join("\n");
}

function sql(value: string | undefined): string {
  if (value === undefined) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}
