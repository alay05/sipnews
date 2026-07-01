import sgMail from "@sendgrid/mail";
import type { DigestRecord } from "@sms-news/data";
import type { EmailClient, EmailMessage } from "./types.js";

export class ConsoleEmailClient implements EmailClient {
  async sendEmail(message: EmailMessage): Promise<void> {
    console.log("[email] SendGrid is not configured; would send:", {
      to: message.to,
      from: message.from,
      subject: message.subject,
      text: message.text
    });
  }
}

export class SendGridEmailClient implements EmailClient {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(message: EmailMessage): Promise<{ providerMessageId?: string }> {
    const [response] = await sgMail.send(message);
    return {
      providerMessageId: response.headers["x-message-id"]
    };
  }
}

export function createEmailClient(options: { apiKey?: string }): EmailClient {
  if (!options.apiKey) {
    throw new Error("SENDGRID_API_KEY is required for worker email delivery");
  }
  return new SendGridEmailClient(options.apiKey);
}

export function buildDigestEmail(
  digest: DigestRecord,
  _publicBaseUrl: string
): Pick<EmailMessage, "subject" | "text" | "html"> {
  const subject = `Daily news digest - ${digest.localDate}`;
  return {
    subject,
    text: ["Daily news digest", ...digest.items.map(formatTextItem)].join("\n\n"),
    html: ["<h1>Daily news digest</h1>", ...digest.items.map(formatHtmlItem)].join("\n\n")
  };
}

function formatTextItem(item: DigestRecord["items"][number]): string {
  const links = item.sourceLinksSnapshot.map((link) => link.url).join("\n");
  return [`${item.itemIndex + 1}. ${item.titleSnapshot}`, item.summarySnapshot, links]
    .filter(Boolean)
    .join("\n");
}

function formatHtmlItem(item: DigestRecord["items"][number]): string {
  const links = item.sourceLinksSnapshot
    .map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.sourceName)}</a>`)
    .join("<br>");

  return [
    "<section>",
    `<h2>${item.itemIndex + 1}. ${escapeHtml(item.titleSnapshot)}</h2>`,
    `<p>${escapeHtml(item.summarySnapshot)}</p>`,
    links ? `<p>${links}</p>` : "",
    "</section>"
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
