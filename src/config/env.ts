import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  SOURCES_CONFIG_PATH: z.string().default("config/sources.json"),
  DATABASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  TWILIO_VALIDATE_WEBHOOKS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  PERSONAL_PHONE_NUMBER: z.string().optional(),
  PERSONAL_USER_ID: z.string().default("personal"),
  PERSONAL_DISPLAY_NAME: z.string().optional(),
  PERSONAL_TIMEZONE: z.string().default("America/New_York"),
  DIGEST_SEND_HOUR: z.coerce.number().int().min(0).max(23).default(7),
  DIGEST_MAX_ITEMS: z.coerce.number().int().min(1).max(10).default(5),
  JOB_SECRET: z.string().default("change-me"),
  FEEDBACK_SECRET: z.string().default("change-me-too")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(): AppEnv {
  return envSchema.parse(process.env);
}
