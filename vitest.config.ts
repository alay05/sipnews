import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@sipnews/contracts",
        replacement: path.join(rootDir, "packages/contracts/src/index.ts")
      },
      {
        find: "@sipnews/core",
        replacement: path.join(rootDir, "packages/core/src/index.ts")
      },
      {
        find: "@sipnews/data",
        replacement: path.join(rootDir, "packages/data/src/index.ts")
      }
    ]
  },
  test: {
    environment: "node",
    globals: true
  }
});
