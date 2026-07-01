import { loadEnv } from "./config/env.js";
import { buildApp } from "./server.js";
import { createProductDataAccess } from "./services/productData.js";

const env = loadEnv();
const app = buildApp(env, createProductDataAccess(env));

app.listen(env.PORT, () => {
  console.log(`sipnews-api listening on port ${env.PORT}`);
});
