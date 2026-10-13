import { Channel, MessageContentType, MessageDirection, MessageSender } from "@prisma/client";
import { prisma } from "../db/prisma";

export interface UpsertContactInput {
  channel: Channel;
  externalId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  profileUrl?: string | null;
}

export async function getOrCreateContact(input: UpsertContactInput) {
  const existing = await prisma.contact.findUnique({
    where: { channel_externalId: { channel: input.channel, externalId: input.externalId } },
  });

  if (existing) {
    const shouldUpdate =
      (input.username && input.username !== existing.username) ||
      (input.firstName && input.firstName !== existing.firstName) ||
      (input.phone && input.phone !== existing.phone) ||
      (input.avatarUrl && input.avatarUrl !== existing.avatarUrl);

    if (shouldUpdate) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: {
          username: input.username ?? existing.username,
          firstName: input.firstName ?? existing.firstName,
          lastName: input.lastName ?? existing.lastName,
          phone: input.phone ?? existing.phone,
          avatarUrl: input.avatarUrl ?? existing.avatarUrl,
          profileUrl: input.profileUrl ?? existing.profileUrl,
        },
      });
    }
    return existing;
  }

  return prisma.contact.create({
    data: {
      channel: input.channel,
      externalId: input.externalId,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      avatarUrl: input.avatarUrl ?? null,
      profileUrl: input.profileUrl ?? null,
    },
  });
}

export async function getOrCreateActiveConversation(contactId: string, channel: Channel) {
  const existing = await prisma.conversation.findFirst({
    where: { contactId, channel, status: { not: "CLOSED" } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: { contactId, channel },
  });
}

export async function appendMessage(params: {
  conversationId: string;
  direction: MessageDirection;
  sender: MessageSender;
  contentType?: MessageContentType;
  text?: string | null;
  mediaUrl?: string | null;
  mediaFileId?: string | null;
  externalMessageId?: string | null;
}) {
  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      direction: params.direction,
      sender: params.sender,
      contentType: params.contentType ?? "TEXT",
      text: params.text ?? null,
      mediaUrl: params.mediaUrl ?? null,
      mediaFileId: params.mediaFileId ?? null,
      externalMessageId: params.externalMessageId ?? null,
    },
  });

  const updateData: { lastMessageAt: Date; hasInteraction?: boolean } = { lastMessageAt: new Date() };
  // Розмова вважається "з взаємодією", коли зʼявилась хоча б одна вихідна відповідь (AI або менеджера).
  if (params.direction === "OUTGOING") {
    updateData.hasInteraction = true;
  }

  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: updateData,
  });

  return message;
}

export async function getConversationHistory(conversationId: string, limit = 30) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit * 2,
  });
}
