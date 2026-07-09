import { createHash } from "node:crypto";
import { Router } from "express";
import { createClerkClient } from "@clerk/backend";
import {
  categoryCountMapSchema,
  digestDetailDtoSchema,
  digestListDtoSchema,
  feedbackRequestDtoSchema,
  meDtoSchema,
  onboardingPayloadSchema,
  onboardingStateDtoSchema,
  userSettingsDtoSchema,
  userSettingsPayloadSchema
} from "@sipnews/contracts";
import type {
  DigestDetailDto,
  DigestItemDto,
  DigestListDto,
  DigestSummaryDto,
  MeDto,
  OnboardingPayload,
  OnboardingStateDto,
  UserSettingsDto,
  UserSettingsPayload
} from "@sipnews/contracts";
import type { CategoryCountMap, DataUser, DigestRecord, UserDigestSettings } from "@sipnews/data";
import type { AuthenticatedRequest } from "../auth/clerk.js";
import type { ProductDataAccess } from "../services/productData.js";
import { digestCreatedAt, digestLocalDate, digestSentAt } from "../services/productData.js";

interface RequestWithUser extends AuthenticatedRequest {
  productUser?: DataUser;
  digestSettings?: UserDigestSettings;
}

interface MeRouterOptions {
  clerkSecretKey?: string;
}

export function createMeRouter(
  data: ProductDataAccess,
  options: MeRouterOptions = {}
): Router {
  const router = Router();
  const clerkClient = options.clerkSecretKey
    ? createClerkClient({ secretKey: options.clerkSecretKey })
    : undefined;

  router.use(async (req: RequestWithUser, res, next) => {
    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const authEmail = normalizedEmail(
      stringClaim(req.auth.claims.email) ??
        (await resolveClerkPrimaryEmail(clerkClient, req.auth.subject))
    );

    let user = await data.repositories.users.findUserByAuth(
      req.auth.provider,
      req.auth.subject
    );
    if (!user && authEmail) {
      user = await data.repositories.users.findUserByEmail(authEmail);
    }
    if (!user) {
      user = provisionUser(req.auth.provider, req.auth.subject, authEmail, stringClaim(req.auth.claims.name));
      await data.repositories.users.upsertUser(user);
      await data.repositories.users.upsertDigestSettings(defaultDigestSettings(user));
    } else {
      const nextUser: DataUser = {
        ...user,
        externalAuthProvider: req.auth.provider,
        externalAuthSubject: req.auth.subject,
        email: authEmail ?? user.email,
        displayName: stringClaim(req.auth.claims.name) ?? user.displayName
      };
      await data.repositories.users.upsertUser(nextUser);
      user = nextUser;
    }

    const settings =
      (await data.repositories.users.getDigestSettings(user.id)) ?? defaultDigestSettings(user);
    await data.repositories.users.upsertDigestSettings(settings);

    req.productUser = user;
    req.digestSettings = settings;
    next();
  });

  router.get("/", (req: RequestWithUser, res) => {
    const user = requireUser(req);
    const settings = requireSettings(req);
    const response: MeDto = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive,
      onboardingComplete: onboardingComplete(user, settings)
    };
    res.json(meDtoSchema.parse(response));
  });

  router.get("/onboarding", (req: RequestWithUser, res) => {
    res.json(onboardingStateDtoSchema.parse(onboardingState(requireUser(req), requireSettings(req))));
  });

  router.put("/onboarding", async (req: RequestWithUser, res) => {
    const parsed = onboardingPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid onboarding payload", issues: parsed.error.issues });
      return;
    }

    const next = await saveSettings(data, requireUser(req), requireSettings(req), parsed.data);
    req.digestSettings = next;
    res.json(onboardingStateDtoSchema.parse(onboardingState(requireUser(req), next)));
  });

  router.get("/settings", (req: RequestWithUser, res) => {
    res.json(userSettingsDtoSchema.parse(settingsDto(requireUser(req), requireSettings(req))));
  });

  router.put("/settings", async (req: RequestWithUser, res) => {
    const parsed = userSettingsPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid settings payload", issues: parsed.error.issues });
      return;
    }

    const next = await saveSettings(data, requireUser(req), requireSettings(req), parsed.data);
    req.digestSettings = next;
    const nextUser: DataUser = {
      ...requireUser(req),
      displayName: parsed.data.displayName ?? requireUser(req).displayName,
      isActive: parsed.data.isActive ?? requireUser(req).isActive
    };
    await data.repositories.users.upsertUser(nextUser);
    req.productUser = nextUser;

    res.json(userSettingsDtoSchema.parse(settingsDto(nextUser, next)));
  });

  router.get("/digests", async (req: RequestWithUser, res) => {
    const digests = await data.listDigestsForUser(requireUser(req).id);
    const response: DigestListDto = {
      digests: digests.map(digestSummary)
    };
    res.json(digestListDtoSchema.parse(response));
  });

  router.get("/digests/:id", async (req: RequestWithUser, res) => {
    const user = requireUser(req);
    const digest = await data.repositories.digests.getDigest(String(req.params.id));
    if (!digest || digest.userId !== user.id) {
      res.status(404).json({ error: "Digest not found" });
      return;
    }

    res.json(digestDetailDtoSchema.parse(digestDetail(digest)));
  });

  router.post("/feedback", async (req: RequestWithUser, res) => {
    const user = requireUser(req);
    const parsed = feedbackRequestDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid feedback payload", issues: parsed.error.issues });
      return;
    }

    const digest = await data.repositories.digests.getDigest(parsed.data.digestId);
    if (!digest || digest.userId !== user.id) {
      res.status(404).json({ error: "Digest not found" });
      return;
    }

    const item = digest.items.find(
      (candidate: DigestRecord["items"][number]) =>
        candidate.itemIndex === parsed.data.itemIndex
    );
    if (!item) {
      res.status(404).json({ error: "Digest item not found" });
      return;
    }

    const persisted = await data.saveFeedback({
      userId: user.id,
      digest,
      itemIndex: parsed.data.itemIndex,
      sentiment: parsed.data.sentiment
    });
    res.status(persisted ? 201 : 202).json({ ok: true, persisted });
  });

  return router;
}

function requireUser(req: RequestWithUser): DataUser {
  if (!req.productUser) throw new Error("Product user was not resolved");
  return req.productUser;
}

function requireSettings(req: RequestWithUser): UserDigestSettings {
  if (!req.digestSettings) throw new Error("Digest settings were not resolved");
  return req.digestSettings;
}

async function saveSettings(
  data: ProductDataAccess,
  user: DataUser,
  existing: UserDigestSettings,
  payload: OnboardingPayload | UserSettingsPayload
): Promise<UserDigestSettings> {
  const nextSettings: UserDigestSettings = {
    ...existing,
    timezone: payload.timezone,
    sendHour: payload.sendHour,
    digestMaxItems: payload.digestMaxItems,
    summaryLength: payload.summaryLength,
    deliveryAddress: user.email ?? existing.deliveryAddress,
    categoryCounts: payload.categoryCounts
  };
  await data.repositories.users.upsertDigestSettings(nextSettings);
  return nextSettings;
}

function onboardingState(user: DataUser, settings: UserDigestSettings): OnboardingStateDto {
  return {
    isComplete: onboardingComplete(user, settings),
    settings: settingsDto(user, settings)
  };
}

function settingsDto(user: DataUser, settings: UserDigestSettings): UserSettingsDto {
  return {
    displayName: user.displayName,
    email: user.email,
    timezone: settings.timezone,
    sendHour: settings.sendHour,
    digestMaxItems: settings.digestMaxItems,
    categoryCounts: categoryCountMapSchema.parse(settings.categoryCounts),
    summaryLength: settings.summaryLength,
    isActive: user.isActive
  };
}

function digestSummary(digest: DigestRecord): DigestSummaryDto {
  return {
    id: digest.id,
    userId: digest.userId,
    localDate: digestLocalDate(digest),
    createdAt: digestCreatedAt(digest),
    deliveredAt: digestSentAt(digest),
    itemCount: digest.items.length,
    title: digest.title ?? `Daily news digest - ${digestLocalDate(digest)}`
  };
}

function digestDetail(digest: DigestRecord): DigestDetailDto {
  return {
    ...digestSummary(digest),
    bodyText: digest.bodyText,
    items: digest.items.map(digestItem)
  };
}

function digestItem(item: DigestRecord["items"][number]): DigestItemDto {
  return {
    index: item.itemIndex,
    clusterId: item.clusterId,
    title: item.titleSnapshot,
    summary: item.summarySnapshot,
    whyItMatters: item.whyItMattersSnapshot,
    sourceLinks: item.sourceLinksSnapshot,
    topics: item.topicsSnapshot,
    category: item.bucketId as DigestItemDto["category"]
  };
}

function onboardingComplete(user: DataUser, settings: UserDigestSettings): boolean {
  const categoryTotal = Object.values(settings.categoryCounts).reduce((sum, count) => sum + count, 0);
  return Boolean(
    user.email &&
      settings.timezone &&
      settings.digestMaxItems > 0 &&
      settings.sendHour >= 0 &&
      settings.summaryLength &&
      categoryTotal > 0 &&
      categoryTotal === settings.digestMaxItems
  );
}

function provisionUser(
  provider: "clerk",
  subject: string,
  email: string | undefined,
  displayName: string | undefined
): DataUser {
  return {
    id: `user_${createHash("sha256").update(`${provider}:${subject}`).digest("hex").slice(0, 16)}`,
    externalAuthProvider: provider,
    externalAuthSubject: subject,
    email,
    displayName,
    isActive: true
  };
}

function defaultDigestSettings(user: DataUser): UserDigestSettings {
  return {
    userId: user.id,
    timezone: "America/New_York",
    sendHour: 7,
    digestMaxItems: 5,
    summaryLength: "medium",
    deliveryChannel: "email",
    deliveryAddress: user.email,
    categoryCounts: emptyCategoryCounts(),
    sourceWeights: {},
    mutedSources: [],
    preferredBucketIds: [],
    includeBucketLabels: true
  };
}

function emptyCategoryCounts(): CategoryCountMap {
  return {
    world: 0,
    tech: 0,
    ai: 0,
    startups: 0
  };
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizedEmail(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

async function resolveClerkPrimaryEmail(
  clerkClient: ReturnType<typeof createClerkClient> | undefined,
  subject: string
): Promise<string | undefined> {
  if (!clerkClient) return undefined;

  try {
    const user = await clerkClient.users.getUser(subject);
    const primaryEmailId = user.primaryEmailAddressId;
    const primaryEmail = user.emailAddresses.find((email) => email.id === primaryEmailId);
    return stringClaim(primaryEmail?.emailAddress);
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "clerk_email_lookup_failed",
        subject,
        error: error instanceof Error ? error.message : String(error)
      })
    );
    return undefined;
  }
}
