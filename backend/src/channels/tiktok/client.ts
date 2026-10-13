import { env } from "../../config/env";

/**
 * Клієнт для TikTok Business Messaging API.
 *
 * ВАЖЛИВО: TikTok Business Messaging API доступний лише після:
 *   1. Верифікації TikTok Business Account;
 *   2. Реєстрації застосунку в TikTok for Business Developer Portal;
 *   3. Отримання схвалення доступу до Business Messaging API від TikTok.
 *
 * Точні назви полів і базовий URL ендпоінтів TikTok видає лише після підключення застосунку
 * (документація відкривається в порталі після апрува). Нижче — робоча структура клієнта з
 * конфігурованим базовим URL, яку потрібно звірити з офіційною документацією TikTok після
 * отримання доступу (посилання і чекліст — у README, розділ "Підключення TikTok").
 *
 * Обмеження, які потрібно враховувати в логіці бота (вже закладено в pipeline):
 *   - можна відповідати ЛИШЕ користувачам, які самі написали першими;
 *   - вікно для автоматичних відповідей — 48 годин з моменту останнього вхідного повідомлення;
 *   - ліміт орієнтовно 10 автоматичних повідомлень за вікно;
 *   - розсилки та "холодні" DM заборонені політикою TikTok.
 */

const TIKTOK_API_BASE = process.env.TIKTOK_API_BASE_URL || "https://business-api.tiktok.com/open_api/v1.3";

interface TikTokSendResult {
  ok: boolean;
  externalMessageId?: string;
  error?: string;
}

async function tiktokRequest(path: string, body: Record<string, unknown>): Promise<TikTokSendResult> {
  if (!env.tiktok.accessToken || !env.tiktok.businessId) {
    console.warn("[tiktok] Access token / business id не налаштовано, повідомлення не надіслано (заглушка)", {
      path,
      body,
    });
    return { ok: false, error: "TikTok API не налаштовано" };
  }

  try {
    const res = await fetch(`${TIKTOK_API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": env.tiktok.accessToken,
      },
      body: JSON.stringify({ business_id: env.tiktok.businessId, ...body }),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return { ok: false, error: `TikTok API помилка ${res.status}: ${JSON.stringify(data)}` };
    }

    return { ok: true, externalMessageId: (data.message_id as string) ?? undefined };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function sendTikTokText(recipientOpenId: string, text: string): Promise<TikTokSendResult> {
  return tiktokRequest("/business/message/send/", {
    recipient_id: recipientOpenId,
    message: { type: "text", text },
  });
}

export async function sendTikTokMedia(
  recipientOpenId: string,
  mediaUrl: string,
  kind: "image" | "video"
): Promise<TikTokSendResult> {
  return tiktokRequest("/business/message/send/", {
    recipient_id: recipientOpenId,
    message: { type: kind, url: mediaUrl },
  });
}
