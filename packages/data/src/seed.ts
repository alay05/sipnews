import type { DataRepositories } from "./repositories.js";
import type { CategoryCountMap, DataUser, UserDigestSettings } from "./types.js";

export const DEV_USER_ID = "dev-user";
export const DEV_AUTH_PROVIDER = "dev";
export const DEV_AUTH_SUBJECT = "local";

export interface DevSeedUserInput {
  userId?: string;
  email?: string;
  displayName?: string;
  timezone?: string;
  sendHour?: number;
  digestMaxItems?: number;
  summaryLength?: "small" | "medium" | "large";
  deliveryChannel?: string;
  deliveryAddress?: string;
  categoryCounts?: Partial<CategoryCountMap>;
}

export function devUser(input: DevSeedUserInput = {}): DataUser {
  return {
    id: input.userId ?? DEV_USER_ID,
    externalAuthProvider: DEV_AUTH_PROVIDER,
    externalAuthSubject: input.email ?? DEV_AUTH_SUBJECT,
    email: input.email,
    displayName: input.displayName ?? "Dev User",
    isActive: true
  };
}

export function devDigestSettings(
  input: DevSeedUserInput = {}
): UserDigestSettings {
  const digestMaxItems = input.digestMaxItems ?? 5;
  const categoryCounts = normalizeCategoryCounts(input.categoryCounts, digestMaxItems);
  return {
    userId: input.userId ?? DEV_USER_ID,
    timezone: input.timezone ?? "America/New_York",
    sendHour: input.sendHour ?? 7,
    digestMaxItems,
    summaryLength: input.summaryLength ?? "medium",
    deliveryChannel: input.deliveryChannel ?? "email",
    deliveryAddress: input.deliveryAddress ?? input.email,
    categoryCounts,
    sourceWeights: {},
    mutedSources: [],
    preferredBucketIds: [],
    includeBucketLabels: true
  };
}

export async function seedDevUser(
  repositories: Pick<DataRepositories, "users">,
  input: DevSeedUserInput = {}
): Promise<DataUser> {
  const user = devUser(input);
  await repositories.users.upsertUser(user);
  await repositories.users.upsertDigestSettings(
    devDigestSettings({ ...input, userId: user.id })
  );
  return user;
}

function normalizeCategoryCounts(
  input: Partial<CategoryCountMap> | undefined,
  digestMaxItems: number
): CategoryCountMap {
  const counts: CategoryCountMap = {
    world: input?.world ?? 0,
    tech: input?.tech ?? 0,
    ai: input?.ai ?? 0,
    startups: input?.startups ?? 0
  };
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total === digestMaxItems) return counts;
  return {
    world: digestMaxItems,
    tech: 0,
    ai: 0,
    startups: 0
  };
}
