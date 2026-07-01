import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const workerRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(workerRoot, "../..");

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@sipnews/contracts",
        replacement: path.join(repoRoot, "packages/contracts/src/index.ts")
      },
      {
        find: "@sipnews/core",
        replacement: path.join(repoRoot, "packages/core/src/index.ts")
      },
      {
        find: "@sipnews/data",
        replacement: path.join(repoRoot, "packages/data/src/index.ts")
      }
    ]
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"]
  }
});
