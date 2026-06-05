import type { AppEnv } from "../config/env.js";
import { InMemoryStore, type AppStore } from "./store.js";
import { PgStore } from "./pgStore.js";

export function createStore(env: AppEnv): AppStore {
  if (env.DATABASE_URL) return new PgStore(env.DATABASE_URL);
  return new InMemoryStore();
}
