import express from "express";
import { createClerkAuthMiddleware } from "./auth/clerk.js";
import { createMeRouter } from "./routes/me.js";
import type { AppEnv } from "./config/env.js";
import type { ProductDataAccess } from "./services/productData.js";

export function buildApp(
  env: AppEnv,
  productData: ProductDataAccess
) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use(
    "/v1/me",
    createClerkAuthMiddleware(env),
    createMeRouter(productData, {
      clerkSecretKey: env.CLERK_SECRET_KEY
    })
  );

  return app;
}
