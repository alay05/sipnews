import type { Digest, DigestItem } from "../types/articles.js";

const MAX_SMS_BODY_LENGTH = 1450;

export function buildDigestSms(
  digestId: string,
  items: DigestItem[],
  publicBaseUrl: string
): string {
  const lines = ["Daily news digest:"];

  for (const item of items) {
    const link = item.sourceLinks[0]?.url ?? `${publicBaseUrl}/d/${digestId}`;
    lines.push(
      `${item.index}. ${item.title} - ${item.shortSummary} ${link}`
    );
  }

  lines.push(`Reply +2, -3, more AI, less politics, mute Source, or read all: ${publicBaseUrl}/d/${digestId}`);

  return enforceSmsLength(lines.join("\n"));
}

export function enforceSmsLength(body: string): string {
  if (body.length <= MAX_SMS_BODY_LENGTH) return body;
  return `${body.slice(0, MAX_SMS_BODY_LENGTH - 3).trimEnd()}...`;
}

export function toDigestPreview(digest: Digest): string {
  return digest.items
    .map((item) => `${item.index}. ${item.title}`)
    .join("\n");
}
