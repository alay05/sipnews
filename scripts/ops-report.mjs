import "dotenv/config";
import { Pool } from "pg";
import { requireEnv } from "./db-lib.mjs";

const databaseUrl = requireEnv("DATABASE_URL");
const windowHours = parsePositiveInteger(process.env.OPS_REPORT_WINDOW_HOURS, 24);
const pool = new Pool({ connectionString: databaseUrl });

try {
  const report = await buildReport(pool, windowHours);
  printReport(report);
} finally {
  await pool.end();
}

async function buildReport(pool, windowHours) {
  const [latestPrepareRun, latestDeliverRun, digestWindow, deliveryWindow, sourceHealth] =
    await Promise.all([
      latestIngestionRun(pool, "prepare"),
      latestIngestionRun(pool, "deliver"),
      digestWindowSummary(pool, windowHours),
      deliveryWindowSummary(pool, windowHours),
      sourceHealthSummary(pool, windowHours)
    ]);

  return {
    generatedAt: new Date().toISOString(),
    windowHours,
    latestPrepareRun,
    latestDeliverRun,
    digestWindow,
    deliveryWindow,
    sourceHealth
  };
}

async function latestIngestionRun(pool, mode) {
  const result = await pool.query(
    `SELECT
        id,
        status,
        started_at,
        finished_at,
        articles_seen,
        articles_saved,
        clusters_touched,
        error_message,
        metadata
      FROM ingestion_runs
      WHERE metadata->>'mode' = $1
      ORDER BY started_at DESC
      LIMIT 1`,
    [mode]
  );
  return result.rows[0] ?? null;
}

async function digestWindowSummary(pool, windowHours) {
  const result = await pool.query(
    `SELECT
        COUNT(*)::int AS total_digests,
        COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered_digests,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_digests,
        MAX(delivered_at) AS latest_delivered_at
      FROM digests
      WHERE generated_at >= now() - ($1::int * interval '1 hour')`,
    [windowHours]
  );
  return result.rows[0];
}

async function deliveryWindowSummary(pool, windowHours) {
  const result = await pool.query(
    `SELECT
        COUNT(*)::int AS total_runs,
        COUNT(*) FILTER (WHERE status = 'succeeded')::int AS succeeded_runs,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_runs,
        COUNT(*) FILTER (WHERE status = 'skipped_no_content')::int AS skipped_no_content_runs,
        MAX(finished_at) AS latest_finished_at
      FROM delivery_runs
      WHERE queued_at >= now() - ($1::int * interval '1 hour')`,
    [windowHours]
  );

  const failures = await pool.query(
    `SELECT
        id,
        user_id,
        digest_id,
        status,
        destination,
        error_message,
        queued_at,
        finished_at,
        metadata
      FROM delivery_runs
      WHERE queued_at >= now() - ($1::int * interval '1 hour')
        AND status <> 'succeeded'
      ORDER BY queued_at DESC
      LIMIT 10`,
    [windowHours]
  );

  return {
    summary: result.rows[0],
    latestNonSuccessRuns: failures.rows
  };
}

async function sourceHealthSummary(pool, windowHours) {
  const result = await pool.query(
    `SELECT
        source_id,
        COUNT(*)::int AS runs,
        COUNT(*) FILTER (WHERE status = 'succeeded')::int AS succeeded_runs,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_runs,
        MAX(finished_at) AS latest_finished_at,
        SUM(articles_seen)::int AS articles_seen,
        SUM(articles_saved)::int AS articles_saved
      FROM ingestion_run_sources
      WHERE started_at >= now() - ($1::int * interval '1 hour')
      GROUP BY source_id
      ORDER BY failed_runs DESC, source_id ASC`,
    [windowHours]
  );
  return result.rows;
}

function printReport(report) {
  console.log(`Ops report generated at ${report.generatedAt}`);
  console.log(`Window: last ${report.windowHours} hours`);
  console.log("");
  console.log("Latest prepare run:");
  printJsonBlock(report.latestPrepareRun);
  console.log("");
  console.log("Latest deliver run:");
  printJsonBlock(report.latestDeliverRun);
  console.log("");
  console.log("Digest window summary:");
  printJsonBlock(report.digestWindow);
  console.log("");
  console.log("Delivery window summary:");
  printJsonBlock(report.deliveryWindow.summary);
  if (report.deliveryWindow.latestNonSuccessRuns.length > 0) {
    console.log("Recent non-success delivery runs:");
    printJsonBlock(report.deliveryWindow.latestNonSuccessRuns);
  }
  console.log("");
  console.log("Source health:");
  printJsonBlock(report.sourceHealth);
}

function printJsonBlock(value) {
  console.log(JSON.stringify(value, null, 2));
}

function parsePositiveInteger(value, fallback) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
