import { Router } from "express";
import {
  applyFeedback,
  parseFeedbackCommand,
  verifyFeedbackToken
} from "../core/feedback.js";
import type { AppStore } from "../services/store.js";

export function createDigestRouter(store: AppStore, feedbackSecret: string): Router {
  const router = Router();

  router.get("/d/:digestId", async (req, res) => {
    const digest = await store.getDigest(req.params.digestId);
    if (!digest) {
      res.status(404).json({ error: "Digest not found" });
      return;
    }

    res.json(digest);
  });

  router.get("/f/:token", async (req, res) => {
    try {
      const token = verifyFeedbackToken(req.params.token, feedbackSecret);
      const command = parseFeedbackCommand(
        token.sentiment === "like" ? `+${token.itemIndex}` : `-${token.itemIndex}`
      );
      await store.saveFeedback(command, token.digestId);
      const preferences = await store.getPreferences();
      await store.savePreferences(applyFeedback(preferences, command));
      res.json({ ok: true, feedback: token.sentiment });
    } catch {
      res.status(400).json({ error: "Invalid feedback token" });
    }
  });

  return router;
}
