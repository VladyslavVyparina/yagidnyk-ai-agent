import { Telegraf } from "telegraf";
import { env } from "../config/env";

let notifyBot: Telegraf | null = null;

function getNotifyBot(): Telegraf | null {
  // Якщо окремого бота сповіщень не налаштовано, використовуємо клієнтського бота —
  // достатньо додати його адміністратором у чат/групу Романа.
  const token = env.telegram.notifyBotToken || env.telegram.clientBotToken;
  if (!token) return null;
  if (!notifyBot) {
    notifyBot = new Telegraf(token);
  }
  return notifyBot;
}

/** Надсилає повідомлення в окремий Telegram-чат сповіщень для Романа. */
export async function notifyManager(text: string): Promise<void> {
  const bot = getNotifyBot();
  if (!bot || !env.telegram.notifyChatId) {
    console.warn("[notifyManager] Бот/чат сповіщень не налаштовано, повідомлення не надіслано:\n", text);
    return;
  }
  try {
    await bot.telegram.sendMessage(env.telegram.notifyChatId, text);
  } catch (err) {
    console.error("[notifyManager] Помилка надсилання сповіщення:", err);
  }
}

export function formatChannelLabel(channel: "TELEGRAM" | "TIKTOK"): string {
  return channel === "TELEGRAM" ? "Telegram" : "TikTok";
}
