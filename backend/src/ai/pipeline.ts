import { Channel, MessageContentType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { appendMessage, getConversationHistory, getOrCreateActiveConversation, getOrCreateContact, UpsertContactInput } from "../services/conversation";
import { runAgent } from "./agent";

const PHONE_REGEX = /(\+?38)?0\d{9}\b|\+?\d{10,13}/;

function extractPhone(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.replace(/[\s()-]/g, "").match(PHONE_REGEX);
  return match ? match[0] : null;
}

export interface IncomingMessagePayload {
  contact: UpsertContactInput;
  contentType: MessageContentType;
  text?: string | null;
  mediaUrl?: string | null;
  mediaFileId?: string | null;
  externalMessageId?: string | null;
  explicitPhone?: string | null; // напр. з Telegram contact-картки
}

export interface PipelineResult {
  conversationId: string;
  contactId: string;
  replyText: string | null;
  aiHandled: boolean;
}

export async function processIncomingMessage(channel: Channel, payload: IncomingMessagePayload): Promise<PipelineResult> {
  const contact = await getOrCreateContact(payload.contact);
  const conversation = await getOrCreateActiveConversation(contact.id, channel);

  const detectedPhone = payload.explicitPhone ?? extractPhone(payload.text);
  if (detectedPhone && detectedPhone !== contact.phone) {
    await prisma.contact.update({ where: { id: contact.id }, data: { phone: detectedPhone } });
  }

  await appendMessage({
    conversationId: conversation.id,
    direction: "INCOMING",
    sender: "CLIENT",
    contentType: payload.contentType,
    text: payload.text ?? null,
    mediaUrl: payload.mediaUrl ?? null,
    mediaFileId: payload.mediaFileId ?? null,
    externalMessageId: payload.externalMessageId ?? null,
  });

  if (conversation.status === "HANDED_OFF" || conversation.status === "CLOSED") {
    return { conversationId: conversation.id, contactId: contact.id, replyText: null, aiHandled: false };
  }

  if (!payload.text || payload.contentType !== "TEXT") {
    // Медіа без тексту: AI підтверджує отримання, без спроби "аналізувати" вміст файлу.
    const ackText =
      payload.contentType === "PHOTO"
        ? "Дякую, фото отримав. Підкажіть, будь ласка, яка це сировина і орієнтовний обʼєм."
        : "Дякую, отримав. Уточню деталі найближчим часом.";
    await appendMessage({
      conversationId: conversation.id,
      direction: "OUTGOING",
      sender: "AI",
      contentType: "TEXT",
      text: ackText,
    });
    return { conversationId: conversation.id, contactId: contact.id, replyText: ackText, aiHandled: true };
  }

  const history = await getConversationHistory(conversation.id);
  const { replyText, handedOff } = await runAgent({
    contactId: contact.id,
    conversationId: conversation.id,
    channel,
    history: history.slice(0, -1), // без щойно доданого вхідного повідомлення (передається окремо)
    incomingText: payload.text,
  });

  await appendMessage({
    conversationId: conversation.id,
    direction: "OUTGOING",
    sender: "AI",
    contentType: "TEXT",
    text: replyText,
  });

  return { conversationId: conversation.id, contactId: contact.id, replyText, aiHandled: !handedOff };
}
