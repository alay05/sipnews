"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import {
  categoryCountMapSchema,
  onboardingPayloadSchema,
  summaryLengthSchema,
  userSettingsPayloadSchema
} from "@sms-news/contracts";
import { createApiClient } from "@/lib/apiClient";

export async function saveOnboardingAction(formData: FormData): Promise<void> {
  const api = createApiClient({ authToken: await authToken() });
  const payload = onboardingPayloadSchema.parse({
    displayName: stringValue(formData.get("displayName")),
    timezone: stringValue(formData.get("timezone")),
    sendHour: numberValue(formData.get("sendHour")),
    digestMaxItems: numberValue(formData.get("digestMaxItems")),
    categoryCounts: categoryCountsValue(formData),
    summaryLength: summaryLengthValue(formData.get("summaryLength"))
  });
  await api.saveOnboarding(payload);
  revalidateProductPages();
}

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const api = createApiClient({ authToken: await authToken() });
  const payload = userSettingsPayloadSchema.parse({
    displayName: stringValue(formData.get("displayName")),
    timezone: stringValue(formData.get("timezone")),
    sendHour: numberValue(formData.get("sendHour")),
    digestMaxItems: numberValue(formData.get("digestMaxItems")),
    categoryCounts: categoryCountsValue(formData),
    summaryLength: summaryLengthValue(formData.get("summaryLength")),
    isActive: formData.get("isActive") === "on"
  });
  await api.saveSettings(payload);
  revalidateProductPages();
}

async function authToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken();
}

function stringValue(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function numberValue(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function categoryCountsValue(formData: FormData) {
  return categoryCountMapSchema.parse({
    world: numberValue(formData.get("countWorld")) ?? 0,
    tech: numberValue(formData.get("countTech")) ?? 0,
    ai: numberValue(formData.get("countAi")) ?? 0,
    startups: numberValue(formData.get("countStartups")) ?? 0
  });
}

function summaryLengthValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  return summaryLengthSchema.parse(value);
}

function revalidateProductPages(): void {
  revalidatePath("/app");
  revalidatePath("/app/onboarding");
  revalidatePath("/app/settings");
  revalidatePath("/app/digests");
}
