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
  PERSONAL_PHONE_NUMBER: z.string().optional(),
  JOB_SECRET: z.string().default("change-me"),
  FEEDBACK_SECRET: z.string().default("change-me-too")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(): AppEnv {
  return envSchema.parse(process.env);
}
