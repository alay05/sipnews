import { loadEnv } from "./config/env.js";
import { buildApp } from "./server.js";
import { createStore } from "./services/createStore.js";
import { createProductDataAccess } from "./services/productData.js";

const env = loadEnv();
const app = buildApp(env, createStore(env), createProductDataAccess(env));

app.listen(env.PORT, () => {
  console.log(`sms-news-digest listening on http://localhost:${env.PORT}`);
});
