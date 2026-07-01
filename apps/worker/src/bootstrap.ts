import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

const workerRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: resolve(workerRoot, ".env") });

const { main } = await import("./index.js");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
