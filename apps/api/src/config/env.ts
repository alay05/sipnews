import "dotenv/config";
import { z } from "zod";

const blankToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

const optionalString = z.preprocess(blankToUndefined, z.string().optional());

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3000),
    PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1),
    CLERK_JWT_ISSUER: z.string().min(1),
    CLERK_JWT_AUDIENCE: optionalString,
    ALLOWED_USER_EMAILS: optionalString
  });

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(): AppEnv {
  return envSchema.parse(process.env);
}
