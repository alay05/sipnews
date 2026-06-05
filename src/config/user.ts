import type { AppUser } from "../types/articles.js";
import type { AppEnv } from "./env.js";

export function configuredPersonalUser(env: AppEnv): AppUser | undefined {
  if (!env.PERSONAL_PHONE_NUMBER) return undefined;

  return {
    id: env.PERSONAL_USER_ID,
    phoneNumber: normalizePhone(env.PERSONAL_PHONE_NUMBER),
    displayName: env.PERSONAL_DISPLAY_NAME,
    timezone: env.PERSONAL_TIMEZONE,
    sendHour: env.DIGEST_SEND_HOUR,
    digestMaxItems: env.DIGEST_MAX_ITEMS,
    isActive: true
  };
}

export function normalizePhone(phoneNumber: string): string {
  return phoneNumber.trim();
}
