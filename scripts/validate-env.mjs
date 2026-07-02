import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const mode = process.argv[2] ?? "local";
const workerEnvPath = "apps/worker/.env";

const modes = {
  api: {
    files: [
      {
        path: "apps/api/.env",
        requiredKeys: ["DATABASE_URL", "CLERK_JWT_ISSUER"]
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
          "OPENAI_API_KEY",
          "SENDGRID_API_KEY",
          "DIGEST_EMAIL_FROM"
        ]
      }
    ]
  },
  "worker-runtime": {
    files: [],
    envKeys: ["DATABASE_URL", "OPENAI_API_KEY", "SENDGRID_API_KEY", "DIGEST_EMAIL_FROM"]
  },
  seed: {
    files: [
      {
        path: ".env",
        requiredKeys: ["DATABASE_URL"]
      }
    ]
  },
  local: {
    files: [
      {
        path: "apps/api/.env",
        requiredKeys: ["DATABASE_URL", "CLERK_JWT_ISSUER"]
      },
      {
        path: "apps/web/.env",
        requiredKeys: ["NEXT_PUBLIC_SIPNEWS_API_URL"]
      },
      {
        path: workerEnvPath,
        requiredKeys: [
          "DATABASE_URL",
          "OPENAI_API_KEY",
          "SENDGRID_API_KEY",
          "DIGEST_EMAIL_FROM"
        ]
      }
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
}

if (mode === "worker" || mode === "local" || mode === "worker-runtime") {
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

  if (!workerSourcesPath) {
    const workerEnvAbsolutePath = path.join(repoRoot, workerEnvPath);
    if (!existsSync(workerEnvAbsolutePath)) {
      failures.push(`Missing ${workerEnvPath} and SOURCES_CONFIG_PATH in process environment`);
      return;
    }

    const workerEnv = parseEnvFile(readFileSync(workerEnvAbsolutePath, "utf8"));
    workerSourcesPath = workerEnv.SOURCES_CONFIG_PATH ?? "../../config/sources.json";
  }

  const resolvedSourcesPath = path.resolve(repoRoot, "apps/worker", workerSourcesPath);
  const displayPath = path.relative(repoRoot, resolvedSourcesPath);

  if (!existsSync(resolvedSourcesPath)) {
    failures.push(
      `Missing worker sources file ${displayPath} referenced by ${workerEnvPath} SOURCES_CONFIG_PATH`
    );
  }
}
