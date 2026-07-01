import { Router } from "express";
import {
  digestDetailDtoSchema,
  digestListDtoSchema,
  feedbackRequestDtoSchema,
  topicCategories,
  userSettingsPayloadSchema
} from "@sms-news/contracts";
import type {
  DigestDetailDto,
  DigestItemDto,
  DigestListDto,
  DigestSummaryDto,
  UserSettingsPayload
} from "@sms-news/contracts";
import type {
  DataUser,
  DigestRecord,
  UserDigestSettings
} from "@sms-news/data";
import type { AuthenticatedRequest } from "../auth/clerk.js";
import type { ProductDataAccess } from "../services/productData.js";
import {
  digestCreatedAt,
  digestLocalDate,
  digestSentAt
} from "../services/productData.js";

interface RequestWithUser extends AuthenticatedRequest {
  productUser?: DataUser;
}

export function createMeRouter(data: ProductDataAccess): Router {
  const router = Router();

  router.use(async (req: RequestWithUser, res, next) => {
    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await data.repositories.users.findUserByAuth(
      req.auth.provider,
      req.auth.subject
    );
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    req.productUser = user;
    next();
  });

  router.get("/", (req: RequestWithUser, res) => {
    const user = requireUser(req);
    res.json({
      id: user.id,
      authProvider: user.externalAuthProvider,
      authSubject: user.externalAuthSubject,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive
    });
  });

  router.get("/settings", async (req: RequestWithUser, res) => {
    const user = requireUser(req);
    const settings = await data.repositories.users.getDigestSettings(user.id);
    if (!settings) {
      res.status(404).json({ error: "Settings not found" });
      return;
    }

    res.json(settingsResponse(user, settings));
  });

  router.put("/settings", async (req: RequestWithUser, res) => {
    const user = requireUser(req);
    const parsed = userSettingsPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid settings payload", issues: parsed.error.issues });
      return;
    }

    const existing = await data.repositories.users.getDigestSettings(user.id);
    if (!existing) {
      res.status(404).json({ error: "Settings not found" });
      return;
    }

    await data.repositories.users.upsertUser({
      ...user,
      displayName: parsed.data.displayName ?? user.displayName,
      isActive: parsed.data.isActive ?? user.isActive
    });

    const nextSettings = mergeSettings(existing, parsed.data);
    await data.repositories.users.upsertDigestSettings(nextSettings);

    res.json(settingsResponse({ ...user, ...parsed.data }, nextSettings));
  });

  router.get("/digests", async (req: RequestWithUser, res) => {
    const user = requireUser(req);
    const digests = await data.listDigestsForUser(user.id);
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
      (candidate) => candidate.itemIndex === parsed.data.itemIndex
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

function mergeSettings(
  existing: UserDigestSettings,
  payload: UserSettingsPayload
): UserDigestSettings {
  return {
    ...existing,
    timezone: payload.timezone ?? existing.timezone,
    sendHour: payload.sendHour ?? existing.sendHour,
    digestMaxItems: payload.digestMaxItems ?? existing.digestMaxItems,
    topicWeights: payload.categories
      ? Object.fromEntries(payload.categories.map((category) => [category, 1]))
      : existing.topicWeights
  };
}

function settingsResponse(
  user: Pick<DataUser, "displayName" | "isActive">,
  settings: UserDigestSettings
): UserSettingsPayload {
  const categories = topicCategories.filter(
    (category) => settings.topicWeights[category] !== 0
  );
  return {
    displayName: user.displayName,
    timezone: settings.timezone,
    sendHour: settings.sendHour,
    digestMaxItems: settings.digestMaxItems,
    categories: categories.length > 0 ? categories : [...topicCategories],
    summaryLength: "standard",
    isActive: user.isActive
  };
}

function digestSummary(digest: DigestRecord): DigestSummaryDto {
  return {
    id: digest.id,
    userId: digest.userId,
    localDate: digestLocalDate(digest),
    createdAt: digestCreatedAt(digest),
    sentAt: digestSentAt(digest),
    itemCount: digest.items.length
  };
}

function digestDetail(digest: DigestRecord): DigestDetailDto {
  return {
    ...digestSummary(digest),
    smsBody: digest.bodyText ?? "",
    items: digest.items.map(digestItem)
  };
}

function digestItem(item: DigestRecord["items"][number]): DigestItemDto {
  return {
    index: item.itemIndex,
    clusterId: item.clusterId,
    title: item.titleSnapshot,
    shortSummary: item.summarySnapshot,
    whyItMatters: item.whyItMattersSnapshot,
    sourceLinks: item.sourceLinksSnapshot,
    topics: item.topicsSnapshot,
    category: topicCategories.find((category) => item.topicsSnapshot.includes(category))
  };
}
