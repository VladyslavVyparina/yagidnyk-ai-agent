import express from "express";
import cors from "cors";
import path from "node:path";
import { env } from "./config/env";
import { authRouter } from "./admin/routes/auth";
import { conversationsRouter } from "./admin/routes/conversations";
import { contactsRouter } from "./admin/routes/contacts";
import { knowledgeBaseRouter } from "./admin/routes/knowledgeBase";
import { productsRouter } from "./admin/routes/products";
import { leadsRouter } from "./admin/routes/leads";
import { requireAuth } from "./admin/middleware/authMiddleware";
import { tiktokWebhookRouter } from "./channels/tiktok/webhook";
import { clientBot } from "./channels/telegram/bot";

export function createServer() {
  const app = express();

  app.use(cors({ origin: env.adminPanelOrigin, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use("/uploads", express.static(path.resolve(env.media.storagePath)));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Публічні
  app.use("/api/auth", authRouter);
  app.use("/webhooks/tiktok", tiktokWebhookRouter);
  if (env.telegram.mode === "webhook") {
    app.use(clientBot.webhookCallback("/webhooks/telegram/client"));
  }

  // Захищені (адмінка)
  app.use("/api/conversations", requireAuth, conversationsRouter);
  app.use("/api/contacts", requireAuth, contactsRouter);
  app.use("/api/knowledge-base", requireAuth, knowledgeBaseRouter);
  app.use("/api/products", requireAuth, productsRouter);
  app.use("/api/leads", requireAuth, leadsRouter);

  return app;
}
