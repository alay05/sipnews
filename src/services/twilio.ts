import twilio from "twilio";

export interface SmsClient {
  sendSms(message: { to: string; from: string; body: string }): Promise<void>;
}

export class ConsoleSmsClient implements SmsClient {
  async sendSms(message: { to: string; from: string; body: string }): Promise<void> {
    console.log("[sms] Twilio is not configured; would send:", message);
  }
}

export class TwilioSmsClient implements SmsClient {
  private readonly client: twilio.Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = twilio(accountSid, authToken);
  }

  async sendSms(message: { to: string; from: string; body: string }): Promise<void> {
    await this.client.messages.create(message);
  }
}

export function createSmsClient(options: {
  accountSid?: string;
  authToken?: string;
}): SmsClient {
  if (!options.accountSid || !options.authToken) return new ConsoleSmsClient();
  return new TwilioSmsClient(options.accountSid, options.authToken);
}
