import { Router } from "express";
import { env } from "../../config/env";
import { processIncomingMessage } from "../../ai/pipeline";
import { sendTikTokText } from "./client";

export const tiktokWebhookRouter = Router();

/**
 * TikTok надсилає верифікаційний запит (GET або challenge у POST залежно від типу підписки)
 * при підключенні вебхука. Точний механізм верифікації підтверджується в порталі після апрува
 * доступу — нижче реалізовано найпоширеніший варіант (echo challenge token).
 */
tiktokWebhookRouter.get("/", (req, res) => {
  const challenge = req.query["challenge"];
  const verifyToken = req.query["verify_token"];

  if (verifyToken && verifyToken !== env.tiktok.webhookVerifyToken) {
    return res.status(403).send("Невірний verify_token");
  }

  return res.status(200).send(challenge ?? "ok");
});

interface TikTokWebhookEvent {
  event: string;
  business_id?: string;
  data?: {
    sender_id?: string;
    sender_username?: string;
    sender_display_name?: string;
    sender_avatar_url?: string;
    message_id?: string;
    content?: {
      type?: "text" | "image" | "video";
      text?: string;
      url?: string;
    };
  };
}

tiktokWebhookRouter.post("/", async (req, res) => {
  // Одразу відповідаємо 200, щоб TikTok не ретраїв доставку, обробка йде асинхронно.
  res.status(200).send("ok");

  try {
    const events: TikTokWebhookEvent[] = Array.isArray(req.body?.events) ? req.body.events : [req.body];

    for (const evt of events) {
      if (!evt || evt.event !== "message.received") continue;
      const data = evt.data;
      if (!data?.sender_id) continue;

      const contentType = data.content?.type === "image" ? "PHOTO" : data.content?.type === "video" ? "VIDEO" : "TEXT";

      const result = await processIncomingMessage("TIKTOK", {
        contact: {
          channel: "TIKTOK",
          externalId: data.sender_id,
          username: data.sender_username ?? null,
          firstName: data.sender_display_name ?? null,
          avatarUrl: data.sender_avatar_url ?? null,
          profileUrl: data.sender_username ? `https://www.tiktok.com/@${data.sender_username}` : null,
        },
        contentType,
        text: data.content?.text ?? null,
        mediaUrl: data.content?.url ?? null,
        externalMessageId: data.message_id ?? null,
      });

      if (result.replyText) {
        await sendTikTokText(data.sender_id, result.replyText);
      }
    }
  } catch (err) {
    console.error("[tiktok webhook] Помилка обробки події:", err);
  }
});
