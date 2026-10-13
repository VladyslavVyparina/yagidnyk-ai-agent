import { clientBot } from "./bot";

export async function sendTelegramText(chatId: string, text: string): Promise<string | null> {
  const msg = await clientBot.telegram.sendMessage(chatId, text);
  return String(msg.message_id);
}

export async function sendTelegramPhoto(chatId: string, urlOrFileId: string, caption?: string): Promise<string | null> {
  const msg = await clientBot.telegram.sendPhoto(chatId, urlOrFileId, caption ? { caption } : undefined);
  return String(msg.message_id);
}

export async function sendTelegramVideo(chatId: string, urlOrFileId: string, caption?: string): Promise<string | null> {
  const msg = await clientBot.telegram.sendVideo(chatId, urlOrFileId, caption ? { caption } : undefined);
  return String(msg.message_id);
}

export async function sendTelegramDocument(chatId: string, urlOrFileId: string, caption?: string): Promise<string | null> {
  const msg = await clientBot.telegram.sendDocument(chatId, urlOrFileId, caption ? { caption } : undefined);
  return String(msg.message_id);
}
