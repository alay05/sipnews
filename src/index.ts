import { loadEnv } from "./config/env.js";
import { buildApp } from "./server.js";

const env = loadEnv();
const app = buildApp(env);

app.listen(env.PORT, () => {
  console.log(`sms-news-digest listening on http://localhost:${env.PORT}`);
});
