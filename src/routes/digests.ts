import { Router } from "express";
import { parseFeedbackCommand, verifyFeedbackToken } from "../core/feedback.js";
import {
  feedbackContextForDigestItem,
  saveFeedbackAndPreferences
} from "../services/feedbackService.js";
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
      const digest = await store.getDigest(token.digestId);
      if (!digest) {
        res.status(404).json({ error: "Digest not found" });
        return;
      }

      const item = await store.getDigestItem(token.digestId, token.itemIndex);
      const context = item ? feedbackContextForDigestItem(item) : undefined;
      await saveFeedbackAndPreferences(store, digest.userId, command, {
        ...context,
        digestId: token.digestId,
        itemIndex: token.itemIndex,
        sentiment: token.sentiment
      });
      res.json({ ok: true, feedback: token.sentiment });
    } catch {
      res.status(400).json({ error: "Invalid feedback token" });
    }
  });

  return router;
}
