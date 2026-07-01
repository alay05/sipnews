import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const version = "001_init.sql";
const pool = new Pool({ connectionString: databaseUrl });

try {
  const sql = await readFile(join(process.cwd(), "migrations", version), "utf8");
  await pool.query("BEGIN");
  await pool.query(`DROP SCHEMA IF EXISTS public CASCADE`);
  await pool.query(`CREATE SCHEMA public`);
  await pool.query(`
    CREATE TABLE schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(sql);
  await pool.query(`INSERT INTO schema_migrations (version) VALUES ($1)`, [version]);
  await pool.query("COMMIT");
  console.log(`[db:migrate] applied ${version}`);
} catch (error) {
  await pool.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await pool.end();
}
