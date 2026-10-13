import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { sendMediaToContact, sendTextToContact } from "../../messaging/outbound";

export const conversationsRouter = Router();

fs.mkdirSync(env.media.storagePath, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: env.media.storagePath,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, unique);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Список розмов. За замовчуванням показуємо лише ті, де вже була реальна взаємодія
// (є хоча б одна вихідна відповідь), як просив клієнт — порожні/незапущені чати ховаємо.
conversationsRouter.get("/", async (req, res) => {
  const channel = typeof req.query.channel === "string" ? req.query.channel.toUpperCase() : undefined;
  const onlyWithInteraction = req.query.all !== "true";

  const conversations = await prisma.conversation.findMany({
    where: {
      ...(channel ? { channel: channel as "TELEGRAM" | "TIKTOK" } : {}),
      ...(onlyWithInteraction ? { hasInteraction: true } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  res.json(
    conversations.map((c) => ({
      id: c.id,
      channel: c.channel,
      status: c.status,
      lastMessageAt: c.lastMessageAt,
      contact: {
        id: c.contact.id,
        username: c.contact.username,
        firstName: c.contact.firstName,
        lastName: c.contact.lastName,
        phone: c.contact.phone,
        avatarUrl: c.contact.avatarUrl,
      },
      lastMessage: c.messages[0]
        ? { text: c.messages[0].text, contentType: c.messages[0].contentType, direction: c.messages[0].direction, createdAt: c.messages[0].createdAt }
        : null,
    }))
  );
});

conversationsRouter.get("/:id", async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
      leads: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!conversation) return res.status(404).json({ error: "Розмову не знайдено" });
  res.json(conversation);
});

const replySchema = z.object({ text: z.string().min(1) });

conversationsRouter.post("/:id/reply", async (req, res) => {
  const parsed = replySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Текст повідомлення обовʼязковий" });

  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation) return res.status(404).json({ error: "Розмову не знайдено" });

  await sendTextToContact(conversation.contactId, parsed.data.text, "MANAGER");
  res.json({ ok: true });
});

conversationsRouter.post("/:id/media", upload.single("file"), async (req, res) => {
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation) return res.status(404).json({ error: "Розмову не знайдено" });
  if (!req.file) return res.status(400).json({ error: "Файл не додано" });

  const kindParam = String(req.body.kind || "").toUpperCase();
  const kind = (["PHOTO", "VIDEO", "DOCUMENT"].includes(kindParam) ? kindParam : "DOCUMENT") as "PHOTO" | "VIDEO" | "DOCUMENT";
  const fileUrl = `${env.media.publicBaseUrl}/uploads/${req.file.filename}`;

  await sendMediaToContact(conversation.contactId, { kind, url: fileUrl, caption: req.body.caption }, "MANAGER");
  res.json({ ok: true, url: fileUrl });
});

conversationsRouter.post("/:id/toggle-ai", async (req, res) => {
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation) return res.status(404).json({ error: "Розмову не знайдено" });

  const nextStatus = conversation.status === "AI_ACTIVE" ? "HANDED_OFF" : "AI_ACTIVE";
  const updated = await prisma.conversation.update({ where: { id: conversation.id }, data: { status: nextStatus } });
  res.json(updated);
});

conversationsRouter.post("/:id/close", async (req, res) => {
  const updated = await prisma.conversation.update({ where: { id: req.params.id }, data: { status: "CLOSED" } });
  res.json(updated);
});
