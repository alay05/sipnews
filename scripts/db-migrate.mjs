import "dotenv/config";
import path from "node:path";
import { Pool } from "pg";
import { applyPendingMigrations, requireEnv } from "./db-lib.mjs";

const databaseUrl = requireEnv("DATABASE_URL");
const pool = new Pool({ connectionString: databaseUrl });
const migrationsDirectory = path.join(process.cwd(), "migrations");

try {
  const result = await applyPendingMigrations(pool, migrationsDirectory);
  if (result.appliedVersions.length === 0) {
    console.log("[db:migrate] no pending migrations");
  } else {
    for (const version of result.appliedVersions) {
      console.log(`[db:migrate] applied ${version}`);
    }
  }
} finally {
  await pool.end();
}
