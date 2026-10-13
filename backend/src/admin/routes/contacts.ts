import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";

export const contactsRouter = Router();

contactsRouter.get("/:id", async (req, res) => {
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
    include: { pendingInterests: true, leads: true },
  });
  if (!contact) return res.status(404).json({ error: "Контакт не знайдено" });
  res.json(contact);
});

const updateSchema = z.object({
  notes: z.string().optional(),
  phone: z.string().optional(),
});

contactsRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });

  const updated = await prisma.contact.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(updated);
});
