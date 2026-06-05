import { loadEnv } from "./config/env.js";
import { buildApp } from "./server.js";
import { createStore } from "./services/createStore.js";

const env = loadEnv();
const app = buildApp(env, createStore(env));

app.listen(env.PORT, () => {
  console.log(`sms-news-digest listening on http://localhost:${env.PORT}`);
});
