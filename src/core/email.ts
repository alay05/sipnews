import type { Digest, DigestItem } from "../types/articles.js";

export interface DigestEmail {
  subject: string;
  text: string;
  html: string;
}

export function buildDigestEmail(digest: Digest, _publicBaseUrl: string): DigestEmail {
  const dateLabel = digest.localDate;
  const subject = `Daily news digest - ${dateLabel}`;

  const textBlocks = [
    "Daily news digest",
    ...digest.items.map(formatTextItem),
    "Reply by SMS with +2, -3, more AI, less politics, or mute Source."
  ];

  const htmlBlocks = [
    "<h1>Daily news digest</h1>",
    ...digest.items.map(formatHtmlItem),
    "<p>Reply by SMS with +2, -3, more AI, less politics, or mute Source.</p>"
  ];

  return {
    subject,
    text: textBlocks.join("\n\n"),
    html: htmlBlocks.join("\n\n")
  };
}

function formatTextItem(item: DigestItem): string {
  const links = item.sourceLinks.map((link) => link.url).join("\n");
  return [`${item.index}. ${item.title}`, item.shortSummary, links]
    .filter(Boolean)
    .join("\n");
}

function formatHtmlItem(item: DigestItem): string {
  const links = item.sourceLinks
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}">${escapeHtml(link.sourceName)}</a>`
    )
    .join("<br>");

  return [
    `<section>`,
    `<h2>${item.index}. ${escapeHtml(item.title)}</h2>`,
    `<p>${escapeHtml(item.shortSummary)}</p>`,
    links ? `<p>${links}</p>` : "",
    `</section>`
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
