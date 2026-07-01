import { applyFeedback, type FeedbackCommand } from "../core/feedback.js";
import type { DigestItem } from "../types/articles.js";
import {
  feedbackItemIndex,
  feedbackSentiment,
  feedbackSource,
  feedbackTopic,
  type AppStore,
  type FeedbackContext
} from "./store.js";

export async function saveFeedbackAndPreferences(
  store: AppStore,
  userId: string,
  command: FeedbackCommand,
  context?: FeedbackContext
): Promise<void> {
  await store.saveFeedback(userId, command, context);

  const preferences = await store.getPreferences(userId);
  await store.savePreferences(
    userId,
    applyFeedback(preferences, command, {
      sourceName: context?.sourceName,
      topics: context?.topics
    })
  );
}

export function feedbackContextForDigestItem(item: DigestItem): FeedbackContext {
  return {
    itemIndex: item.index,
    topic: item.topics[0],
    topics: item.topics,
    sourceName: item.sourceLinks[0]?.sourceName
  };
}

export function feedbackContextForCommand(
  command: FeedbackCommand,
  context?: FeedbackContext
): FeedbackContext {
  return {
    itemIndex: context?.itemIndex ?? feedbackItemIndex(command),
    sentiment: context?.sentiment ?? feedbackSentiment(command),
    topic: context?.topic ?? feedbackTopic(command),
    sourceName: context?.sourceName ?? feedbackSource(command),
    rawBody: context?.rawBody ?? command.raw,
    digestId: context?.digestId,
    topics: context?.topics
  };
}
