import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";

export const knowledgeBaseRouter = Router();

knowledgeBaseRouter.get("/", async (_req, res) => {
  const entries = await prisma.knowledgeBaseEntry.findMany({ orderBy: { updatedAt: "desc" } });
  res.json(entries);
});

const entrySchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
});

knowledgeBaseRouter.post("/", async (req, res) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані запису" });

  const entry = await prisma.knowledgeBaseEntry.create({
    data: { ...parsed.data, tags: parsed.data.tags ?? [], source: parsed.data.source ?? "manual" },
  });
  res.status(201).json(entry);
});

knowledgeBaseRouter.patch("/:id", async (req, res) => {
  const parsed = entrySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані запису" });

  const entry = await prisma.knowledgeBaseEntry.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(entry);
});

knowledgeBaseRouter.delete("/:id", async (req, res) => {
  await prisma.knowledgeBaseEntry.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
