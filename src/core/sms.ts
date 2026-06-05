import type { Digest, DigestItem } from "../types/articles.js";

const MAX_SMS_BODY_LENGTH = 1450;

export function buildDigestSms(
  digestId: string,
  items: DigestItem[],
  publicBaseUrl: string
): string {
  const blocks = ["*Daily news digest*"];

  for (const item of items) {
    const links = item.sourceLinks.length
      ? item.sourceLinks.map((link) => link.url).slice(0, 2)
      : [`${publicBaseUrl}/d/${digestId}`];

    blocks.push(
      [
        `*${item.index}. ${item.title}*`,
        item.shortSummary,
        ...links
      ].join("\n")
    );
  }

  blocks.push(
    `Read all: ${publicBaseUrl}/d/${digestId}\nReply +2, -3, more AI, less politics, or mute Source.`
  );

  return enforceSmsLength(blocks.join("\n\n"));
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
