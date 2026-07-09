import "dotenv/config";
import { Pool } from "pg";
import { requireEnv, requireEnvValue } from "./db-lib.mjs";

const databaseUrl = requireEnv("DATABASE_URL");
requireEnvValue("DATABASE_ENV", "development");
requireEnvValue("DATABASE_RESET_ALLOWED", "true");

const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query("BEGIN");
  await pool.query(`DROP SCHEMA IF EXISTS public CASCADE`);
  await pool.query(`CREATE SCHEMA public`);
  await pool.query("COMMIT");
  console.log("[db:reset] dropped and recreated public schema");
} catch (error) {
  await pool.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await pool.end();
}
