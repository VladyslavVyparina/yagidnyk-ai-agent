import { Channel } from "@prisma/client";
import { prisma } from "../db/prisma";
import { notifyManager, formatChannelLabel } from "./notifyManager";

export async function createLeadAndNotify(params: {
  contactId: string;
  conversationId: string;
  channel: Channel;
  productInterest?: string;
  approxVolumeKg?: string;
  summary?: string;
}) {
  const contact = await prisma.contact.findUnique({ where: { id: params.contactId } });

  const lead = await prisma.lead.create({
    data: {
      contactId: params.contactId,
      conversationId: params.conversationId,
      productInterest: params.productInterest,
      approxVolumeKg: params.approxVolumeKg,
      summary: params.summary,
      status: "HANDED_OFF",
    },
  });

  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { status: "HANDED_OFF" },
  });

  const contactLine = [
    contact?.firstName ? `Імʼя: ${contact.firstName}` : null,
    contact?.username ? `Нік: @${contact.username}` : null,
    contact?.phone ? `Телефон: ${contact.phone}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const text = [
    `Новий лід (${formatChannelLabel(params.channel)}) — потребує уваги менеджера.`,
    contactLine || "Контактні дані клієнта поки не надані.",
    params.productInterest ? `Товар: ${params.productInterest}` : null,
    params.approxVolumeKg ? `Орієнтовний обʼєм: ${params.approxVolumeKg} кг` : null,
    params.summary ? `Підсумок: ${params.summary}` : null,
    `Відкрити в адмінці: розмова ${params.conversationId}`,
  ]
    .filter(Boolean)
    .join("\n");

  await notifyManager(text);

  return lead;
}
