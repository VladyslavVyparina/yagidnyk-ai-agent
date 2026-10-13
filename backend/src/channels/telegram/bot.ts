import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { env } from "../../config/env";
import { processIncomingMessage } from "../../ai/pipeline";
import type { MessageContentType } from "@prisma/client";

export const clientBot = new Telegraf(env.telegram.clientBotToken || "unset");

function fullName(first?: string, last?: string): string | null {
  const parts = [first, last].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

async function getAvatarUrl(userId: number): Promise<string | null> {
  try {
    const photos = await clientBot.telegram.getUserProfilePhotos(userId, 0, 1);
    if (photos.total_count === 0) return null;
    const fileId = photos.photos[0][0].file_id;
    const link = await clientBot.telegram.getFileLink(fileId);
    return link.href;
  } catch {
    return null;
  }
}

clientBot.on(message("text"), async (ctx) => {
  const from = ctx.from;
  const avatarUrl = await getAvatarUrl(from.id);

  const result = await processIncomingMessage("TELEGRAM", {
    contact: {
      channel: "TELEGRAM",
      externalId: String(ctx.chat.id),
      username: from.username ?? null,
      firstName: fullName(from.first_name, from.last_name) ?? from.first_name ?? null,
      avatarUrl,
    },
    contentType: "TEXT",
    text: ctx.message.text,
    externalMessageId: String(ctx.message.message_id),
  });

  if (result.replyText) {
    await ctx.reply(result.replyText);
  }
});

clientBot.on(message("contact"), async (ctx) => {
  const from = ctx.from;
  const phone = ctx.message.contact.phone_number;

  const result = await processIncomingMessage("TELEGRAM", {
    contact: {
      channel: "TELEGRAM",
      externalId: String(ctx.chat.id),
      username: from.username ?? null,
      firstName: fullName(from.first_name, from.last_name) ?? from.first_name ?? null,
    },
    contentType: "TEXT",
    text: `Клієнт поділився номером телефону: ${phone}`,
    explicitPhone: phone,
    externalMessageId: String(ctx.message.message_id),
  });

  if (result.replyText) {
    await ctx.reply(result.replyText);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleMedia(ctx: any, contentType: MessageContentType, fileId: string, caption?: string) {
  const from = ctx.from;
  const link = await clientBot.telegram.getFileLink(fileId).catch(() => null);

  const result = await processIncomingMessage("TELEGRAM", {
    contact: {
      channel: "TELEGRAM",
      externalId: String(ctx.chat.id),
      username: from.username ?? null,
      firstName: fullName(from.first_name, from.last_name) ?? from.first_name ?? null,
    },
    contentType,
    text: caption ?? null,
    mediaUrl: link?.href ?? null,
    mediaFileId: fileId,
    externalMessageId: String(ctx.message.message_id),
  });

  if (result.replyText) {
    await ctx.reply(result.replyText);
  }
}

clientBot.on(message("photo"), async (ctx) => {
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  await handleMedia(ctx, "PHOTO", photo.file_id, ctx.message.caption);
});

clientBot.on(message("video"), async (ctx) => {
  await handleMedia(ctx, "VIDEO", ctx.message.video.file_id, ctx.message.caption);
});

clientBot.on(message("document"), async (ctx) => {
  await handleMedia(ctx, "DOCUMENT", ctx.message.document.file_id, ctx.message.caption);
});

clientBot.on(message("voice"), async (ctx) => {
  await handleMedia(ctx, "VOICE", ctx.message.voice.file_id);
});

clientBot.start(async (ctx) => {
  await ctx.reply("Доброго дня! Я Олександр, менеджер команди прийомки лікарських трав Ягідник. Яка сировина вас цікавить?");
});

export async function launchTelegramClientBot() {
  if (!env.telegram.clientBotToken) {
    console.warn("[telegram] TELEGRAM_CLIENT_BOT_TOKEN не задано, клієнтський бот не запущено");
    return;
  }

  if (env.telegram.mode === "webhook" && env.telegram.webhookUrl) {
    await clientBot.telegram.setWebhook(`${env.telegram.webhookUrl}/webhooks/telegram/client`);
    console.log("[telegram] Клієнтський бот працює у режимі webhook");
  } else {
    await clientBot.launch();
    console.log("[telegram] Клієнтський бот запущено у режимі polling");
  }
}
