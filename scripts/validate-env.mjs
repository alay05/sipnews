import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const mode = process.argv[2] ?? "local";
const workerEnvPath = "apps/worker/.env";
const defaultWorkerSourcesPath = "../../config/sources.json";
const localWorkerSourcesOverridePath = "../../config/sources.local.json";

const modes = {
  api: {
    files: [
      {
        path: "apps/api/.env",
        requiredKeys: ["DATABASE_URL", "DATABASE_ENV", "CLERK_JWT_ISSUER"],
        expectedValues: {
          DATABASE_ENV: "development"
        }
      }
    ]
  },
  web: {
    files: [
      {
        path: "apps/web/.env",
        requiredKeys: ["NEXT_PUBLIC_SIPNEWS_API_URL"]
      }
    ]
  },
  worker: {
    files: [
      {
        path: workerEnvPath,
        requiredKeys: [
          "DATABASE_URL",
          "DATABASE_ENV",
          "OPENAI_API_KEY",
          "SENDGRID_API_KEY",
          "DIGEST_EMAIL_FROM"
        ],
        expectedValues: {
          DATABASE_ENV: "development"
        }
      }
    ]
  },
  "worker-prepare": {
    files: [
      {
        path: workerEnvPath,
        requiredKeys: [
          "DATABASE_URL",
          "DATABASE_ENV",
          "OPENAI_API_KEY"
        ],
        expectedValues: {
          DATABASE_ENV: "development"
        }
      }
    ]
  },
  "worker-deliver": {
    files: [
      {
        path: workerEnvPath,
        requiredKeys: [
          "DATABASE_URL",
          "DATABASE_ENV",
          "SENDGRID_API_KEY",
          "DIGEST_EMAIL_FROM",
          "PUBLIC_BASE_URL"
        ],
        expectedValues: {
          DATABASE_ENV: "development"
        }
      }
    ]
  },
  seed: {
    files: [
      {
        path: ".env",
        requiredKeys: ["DATABASE_URL", "DATABASE_ENV", "DATABASE_RESET_ALLOWED"],
        expectedValues: {
          DATABASE_ENV: "development",
          DATABASE_RESET_ALLOWED: "true"
        }
      }
    ]
  },
  bootstrap: {
    files: [
      {
        path: ".env",
        requiredKeys: [
          "DATABASE_URL",
          "DATABASE_ENV",
          "DATABASE_BOOTSTRAP_ALLOWED",
          "FIRST_USER_EMAIL",
          "FIRST_USER_DISPLAY_NAME",
          "FIRST_USER_TIMEZONE",
          "FIRST_USER_SEND_HOUR",
          "FIRST_USER_DIGEST_MAX_ITEMS",
          "FIRST_USER_SUMMARY_LENGTH",
          "FIRST_USER_CATEGORY_COUNTS"
        ],
        expectedValues: {
          DATABASE_ENV: "development",
          DATABASE_BOOTSTRAP_ALLOWED: "true"
        }
      }
    ]
  },
  reset: {
    files: [
      {
        path: ".env",
        requiredKeys: ["DATABASE_URL", "DATABASE_ENV", "DATABASE_RESET_ALLOWED"],
        expectedValues: {
          DATABASE_ENV: "development",
          DATABASE_RESET_ALLOWED: "true"
        }
      }
    ]
  },
  local: {
    files: [
      {
        path: "apps/api/.env",
        requiredKeys: ["DATABASE_URL", "DATABASE_ENV", "CLERK_JWT_ISSUER"],
        expectedValues: {
          DATABASE_ENV: "development"
        }
      },
      {
        path: "apps/web/.env",
        requiredKeys: ["NEXT_PUBLIC_SIPNEWS_API_URL"]
      },
      {
        path: workerEnvPath,
        requiredKeys: [
          "DATABASE_URL",
          "DATABASE_ENV",
          "OPENAI_API_KEY",
          "SENDGRID_API_KEY",
          "DIGEST_EMAIL_FROM"
        ],
        expectedValues: {
          DATABASE_ENV: "development"
        }
      }
    ]
  },
  "worker-runtime": {
    files: [],
    envKeys: ["DATABASE_URL", "OPENAI_API_KEY", "SENDGRID_API_KEY", "DIGEST_EMAIL_FROM"]
  },
  "worker-runtime-prepare": {
    files: [],
    envKeys: ["DATABASE_URL", "OPENAI_API_KEY"]
  },
  "worker-runtime-deliver": {
    files: [],
    envKeys: [
      "DATABASE_URL",
      "SENDGRID_API_KEY",
      "DIGEST_EMAIL_FROM",
      "PUBLIC_BASE_URL"
    ]
  }
};

if (!(mode in modes)) {
  console.error(
    `Unknown env validation mode "${mode}". Expected one of: ${Object.keys(modes).join(", ")}`
  );
  process.exit(1);
}

const failures = [];

if (modes[mode].envKeys?.length) {
  for (const key of modes[mode].envKeys) {
    if (!process.env[key]) {
      failures.push(`Missing ${key} in process environment`);
    }
  }
}

for (const file of modes[mode].files) {
  const absolutePath = path.join(repoRoot, file.path);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${file.path}`);
    continue;
  }

  if (!file.requiredKeys?.length) {
    continue;
  }

  const envValues = parseEnvFile(readFileSync(absolutePath, "utf8"));
  for (const key of file.requiredKeys) {
    if (!envValues[key]) {
      failures.push(`Missing ${key} in ${file.path}`);
    }
  }

  for (const [key, expectedValue] of Object.entries(file.expectedValues ?? {})) {
    if (!envValues[key]) {
      continue;
    }

    if (envValues[key] !== expectedValue) {
      failures.push(
        `Expected ${key}=${expectedValue} in ${file.path}; received ${envValues[key]}`
      );
    }
  }
}

if (
  mode === "worker" ||
  mode === "worker-prepare" ||
  mode === "local" ||
  mode === "worker-runtime" ||
  mode === "worker-runtime-prepare"
) {
  validateWorkerSourcesPath(failures);
}

if (failures.length > 0) {
  console.error(`Env validation failed for mode "${mode}":`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Env validation passed for mode "${mode}".`);

function parseEnvFile(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    values[key] = value;
  }

  return values;
}

function validateWorkerSourcesPath(failures) {
  let workerSourcesPath = process.env.SOURCES_CONFIG_PATH;
  let sourcesPathOrigin = "process environment";
  let workerEnvValues;

  if (!workerSourcesPath) {
    const workerEnvAbsolutePath = path.join(repoRoot, workerEnvPath);
    if (existsSync(workerEnvAbsolutePath)) {
      workerEnvValues = parseEnvFile(readFileSync(workerEnvAbsolutePath, "utf8"));
      workerSourcesPath = workerEnvValues.SOURCES_CONFIG_PATH;
      if (workerSourcesPath) {
        sourcesPathOrigin = `${workerEnvPath} SOURCES_CONFIG_PATH`;
      }
    }
  }

  if (!workerSourcesPath) {
    workerSourcesPath = defaultWorkerSourcesPath;
    sourcesPathOrigin = `default ${defaultWorkerSourcesPath}`;
  }

  const resolvedSourcesPath = path.resolve(repoRoot, "apps/worker", workerSourcesPath);
  const displayPath = path.relative(repoRoot, resolvedSourcesPath);

  if (!existsSync(resolvedSourcesPath)) {
    if (workerSourcesPath === localWorkerSourcesOverridePath) {
      failures.push(
        `Missing optional local override ${displayPath} referenced by ${sourcesPathOrigin}. Copy config/sources.example.json to config/sources.local.json or switch SOURCES_CONFIG_PATH back to ${defaultWorkerSourcesPath}.`
      );
      return;
    }

    failures.push(
      `Missing worker sources file ${displayPath} referenced by ${sourcesPathOrigin}. Expected the committed default config/sources.json or another explicit SOURCES_CONFIG_PATH value.`
    );
    return;
  }

  try {
    const parsed = JSON.parse(readFileSync(resolvedSourcesPath, "utf8"));
    const usesGuardian = Array.isArray(parsed.sources)
      && parsed.sources.some((source) => source?.enabled !== false && source?.type === "guardian");

    if (usesGuardian) {
      const guardianApiKey =
        process.env.THE_GUARDIAN_API_KEY ?? workerEnvValues?.THE_GUARDIAN_API_KEY;
      if (!guardianApiKey) {
        failures.push(
          `Missing THE_GUARDIAN_API_KEY for enabled Guardian sources in ${displayPath}.`
        );
      }
    }
  } catch (error) {
    failures.push(
      `Unable to parse worker sources file ${displayPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
