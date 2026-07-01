import { createHmac, timingSafeEqual } from "node:crypto";
import type { FeedbackRequestDto } from "@sms-news/contracts";
import type { UserPreferences } from "../types/articles.js";

export type FeedbackCommand =
  | { type: "like"; itemIndex: number; raw: string }
  | { type: "dislike"; itemIndex: number; raw: string }
  | { type: "more_topic"; topic: string; raw: string }
  | { type: "less_topic"; topic: string; raw: string }
  | { type: "mute_source"; sourceName: string; raw: string }
  | { type: "save"; itemIndex: number; raw: string }
  | { type: "why"; itemIndex: number; raw: string }
  | { type: "help"; raw: string }
  | { type: "stop"; raw: string }
  | { type: "start"; raw: string }
  | { type: "freeform"; text: string; raw: string };

export function parseFeedbackCommand(body: string): FeedbackCommand {
  const raw = body.trim();
  const normalized = raw.toLowerCase();

  if (normalized === "help") return { type: "help", raw };
  if (normalized === "stop") return { type: "stop", raw };
  if (normalized === "start") return { type: "start", raw };

  const like = normalized.match(/^\+(\d+)$/);
  if (like) return { type: "like", itemIndex: Number(like[1]), raw };

  const dislike = normalized.match(/^-(\d+)$/);
  if (dislike) return { type: "dislike", itemIndex: Number(dislike[1]), raw };

  const more = normalized.match(/^more\s+(.+)$/);
  if (more) return { type: "more_topic", topic: more[1].trim(), raw };

  const less = normalized.match(/^less\s+(.+)$/);
  if (less) return { type: "less_topic", topic: less[1].trim(), raw };

  const mute = raw.match(/^mute\s+(.+)$/i);
  if (mute) return { type: "mute_source", sourceName: mute[1].trim(), raw };

  const save = normalized.match(/^save\s+(\d+)$/);
  if (save) return { type: "save", itemIndex: Number(save[1]), raw };

  const why = normalized.match(/^why\s+(\d+)$/);
  if (why) return { type: "why", itemIndex: Number(why[1]), raw };

  return { type: "freeform", text: raw, raw };
}

export function applyFeedback(
  preferences: UserPreferences,
  command: FeedbackCommand,
  context?: { sourceName?: string; topics?: string[] }
): UserPreferences {
  const next: UserPreferences = {
    topicWeights: { ...preferences.topicWeights },
    sourceWeights: { ...preferences.sourceWeights },
    mutedSources: [...preferences.mutedSources]
  };

  if (command.type === "more_topic") adjustTopic(next, command.topic, 0.25);
  if (command.type === "less_topic") adjustTopic(next, command.topic, -0.25);
  if (command.type === "mute_source") {
    const exists = next.mutedSources.some(
      (source) => source.toLowerCase() === command.sourceName.toLowerCase()
    );
    if (!exists) next.mutedSources.push(command.sourceName);
  }

  if (command.type === "like" || command.type === "dislike") {
    const delta = command.type === "like" ? 0.15 : -0.15;
    for (const topic of context?.topics ?? []) adjustTopic(next, topic, delta);
    if (context?.sourceName) {
      next.sourceWeights[context.sourceName] =
        (next.sourceWeights[context.sourceName] ?? 0) + delta;
    }
  }

  return next;
}

export function createFeedbackToken(
  payload: FeedbackRequestDto,
  secret: string
): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifyFeedbackToken(
  token: string,
  secret: string
): FeedbackRequestDto {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) throw new Error("Invalid feedback token");

  const expected = sign(encoded, secret);
  if (!safeEqual(signature, expected)) throw new Error("Invalid feedback token");

  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
}

function adjustTopic(preferences: UserPreferences, topic: string, delta: number): void {
  const key = topic.toLowerCase();
  preferences.topicWeights[key] = (preferences.topicWeights[key] ?? 0) + delta;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
