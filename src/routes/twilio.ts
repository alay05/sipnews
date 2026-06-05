import { Router } from "express";
import { applyFeedback, parseFeedbackCommand } from "../core/feedback.js";
import type { AppStore } from "../services/store.js";

export function createTwilioRouter(store: AppStore): Router {
  const router = Router();

  router.post("/inbound", async (req, res) => {
    const body = String(req.body?.Body ?? "");
    const command = parseFeedbackCommand(body);
    await store.saveFeedback(command);

    const preferences = await store.getPreferences();
    await store.savePreferences(applyFeedback(preferences, command));

    res.type("text/xml").send(toTwiml(replyFor(command.type)));
  });

  return router;
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
