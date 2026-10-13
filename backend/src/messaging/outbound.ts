import { prisma } from "../db/prisma";
import { sendTelegramText, sendTelegramPhoto, sendTelegramVideo, sendTelegramDocument } from "../channels/telegram/sender";
import { sendTikTokText, sendTikTokMedia } from "../channels/tiktok/client";
import { appendMessage, getOrCreateActiveConversation } from "../services/conversation";

export type OutboundMediaKind = "PHOTO" | "VIDEO" | "DOCUMENT";

export async function sendTextToContact(contactId: string, text: string, sender: "AI" | "MANAGER" = "AI") {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  const conversation = await getOrCreateActiveConversation(contact.id, contact.channel);

  let externalMessageId: string | null = null;
  if (contact.channel === "TELEGRAM") {
    externalMessageId = await sendTelegramText(contact.externalId, text);
  } else {
    const result = await sendTikTokText(contact.externalId, text);
    externalMessageId = result.externalMessageId ?? null;
  }

  await appendMessage({
    conversationId: conversation.id,
    direction: "OUTGOING",
    sender,
    contentType: "TEXT",
    text,
    externalMessageId,
  });

  return conversation;
}

export async function sendMediaToContact(
  contactId: string,
  media: { kind: OutboundMediaKind; url: string; caption?: string },
  sender: "AI" | "MANAGER" = "MANAGER"
) {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  const conversation = await getOrCreateActiveConversation(contact.id, contact.channel);

  let externalMessageId: string | null = null;

  if (contact.channel === "TELEGRAM") {
    if (media.kind === "PHOTO") externalMessageId = await sendTelegramPhoto(contact.externalId, media.url, media.caption);
    else if (media.kind === "VIDEO") externalMessageId = await sendTelegramVideo(contact.externalId, media.url, media.caption);
    else externalMessageId = await sendTelegramDocument(contact.externalId, media.url, media.caption);
  } else {
    if (media.kind === "DOCUMENT") {
      throw new Error("TikTok Business Messaging API не підтримує надсилання довільних файлів, лише зображення/відео.");
    }
    const result = await sendTikTokMedia(contact.externalId, media.url, media.kind === "PHOTO" ? "image" : "video");
    externalMessageId = result.externalMessageId ?? null;
  }

  await appendMessage({
    conversationId: conversation.id,
    direction: "OUTGOING",
    sender,
    contentType: media.kind,
    text: media.caption ?? null,
    mediaUrl: media.url,
    externalMessageId,
  });

  return conversation;
}
