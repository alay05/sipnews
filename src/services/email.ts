import sgMail from "@sendgrid/mail";
import type { DigestEmail } from "../core/email.js";

export interface EmailClient {
  sendEmail(message: DigestEmail & { to: string; from: string }): Promise<void>;
}

export class ConsoleEmailClient implements EmailClient {
  async sendEmail(message: DigestEmail & { to: string; from: string }): Promise<void> {
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

  async sendEmail(message: DigestEmail & { to: string; from: string }): Promise<void> {
    await sgMail.send(message);
  }
}

export function createEmailClient(options: { apiKey?: string }): EmailClient {
  if (!options.apiKey) return new ConsoleEmailClient();
  return new SendGridEmailClient(options.apiKey);
}
