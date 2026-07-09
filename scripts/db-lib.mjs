import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function requireEnvValue(name, expectedValue) {
  const value = requireEnv(name);
  if (value !== expectedValue) {
    throw new Error(`Expected ${name}=${expectedValue}; received ${value}`);
  }
  return value;
}

export async function ensureSchemaMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function listMigrationFiles(migrationsDirectory) {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export async function getAppliedMigrationVersions(pool) {
  const result = await pool.query(`SELECT version FROM schema_migrations ORDER BY version ASC`);
  return new Set(result.rows.map((row) => String(row.version)));
}

export async function applyPendingMigrations(pool, migrationsDirectory) {
  await ensureSchemaMigrationsTable(pool);
  const applied = await getAppliedMigrationVersions(pool);
  const files = await listMigrationFiles(migrationsDirectory);
  const appliedVersions = [];

  for (const version of files) {
    if (applied.has(version)) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDirectory, version), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(
        `INSERT INTO schema_migrations (version) VALUES ($1)`,
        [version]
      );
      await pool.query("COMMIT");
      appliedVersions.push(version);
    } catch (error) {
      await pool.query("ROLLBACK").catch(() => {});
      throw error;
    }
  }

  return {
    availableVersions: files,
    appliedVersions
  };
}
