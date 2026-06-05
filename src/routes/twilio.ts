import { Router } from "express";
import twilio from "twilio";
import { applyFeedback, parseFeedbackCommand } from "../core/feedback.js";
import type { AppEnv } from "../config/env.js";
import {
  feedbackContextForDigestItem,
  feedbackItemIndex,
  feedbackSentiment,
  type AppStore,
  type FeedbackContext
} from "../services/store.js";

export function createTwilioRouter(store: AppStore, env: AppEnv): Router {
  const router = Router();

  router.post("/inbound", async (req, res) => {
    if (!isValidTwilioRequest(req, env)) {
      res.status(403).type("text/xml").send(toTwiml("Invalid Twilio signature."));
      return;
    }

    const body = String(req.body?.Body ?? "");
    const from = String(req.body?.From ?? "");
    const user = await store.getUserByPhone(from);
    if (!user) {
      res.type("text/xml").send(toTwiml("This number is not configured for digests."));
      return;
    }

    const command = parseFeedbackCommand(body);
    const feedbackContext = await contextForCommand(store, user.id, command, body);
    await store.saveFeedback(user.id, command, feedbackContext);

    if (command.type === "stop") await store.updateUserActive(user.id, false);
    if (command.type === "start") await store.updateUserActive(user.id, true);

    const preferences = await store.getPreferences(user.id);
    await store.savePreferences(
      user.id,
      applyFeedback(preferences, command, {
        sourceName: feedbackContext?.sourceName,
        topics: feedbackContext?.topics
      })
    );

    res.type("text/xml").send(toTwiml(replyFor(command.type)));
  });

  return router;
}

function isValidTwilioRequest(
  req: { headers: Record<string, unknown>; body: unknown; originalUrl: string },
  env: AppEnv
): boolean {
  if (!env.TWILIO_VALIDATE_WEBHOOKS) return true;
  if (!env.TWILIO_AUTH_TOKEN) return false;

  const signature = String(req.headers["x-twilio-signature"] ?? "");
  const url = `${env.PUBLIC_BASE_URL}${req.originalUrl}`;
  const params = req.body && typeof req.body === "object" ? req.body : {};

  return twilio.validateRequest(
    env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    params as Record<string, string>
  );
}

function replyFor(type: string): string {
  if (type === "help") {
    return "Reply +2, -3, more AI, less politics, mute Source, save 1, or why 4.";
  }
  if (type === "stop") return "Stopped. Twilio opt-out rules may also apply.";
  if (type === "start") return "Started. You will receive future digests if configured.";
  return "Feedback saved.";
}

function toTwiml(message: string): string {
  return `<Response><Message>${escapeXml(message)}</Message></Response>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function contextForCommand(
  store: AppStore,
  userId: string,
  command: ReturnType<typeof parseFeedbackCommand>,
  rawBody: string
): Promise<FeedbackContext | undefined> {
  const itemIndex = feedbackItemIndex(command);
  const latestDigest = await store.getLatestDigestForUser(userId);
  if (!latestDigest) {
    return { rawBody, itemIndex, sentiment: feedbackSentiment(command) };
  }

  if (!itemIndex) return { digestId: latestDigest.id, rawBody };

  const item = await store.getDigestItem(latestDigest.id, itemIndex);
  return {
    ...(item ? feedbackContextForDigestItem(item) : {}),
    digestId: latestDigest.id,
    itemIndex,
    rawBody,
    sentiment: feedbackSentiment(command)
  };
}
