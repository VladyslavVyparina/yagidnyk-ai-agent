import { Router } from "express";
import { prisma } from "../../db/prisma";

export const leadsRouter = Router();

leadsRouter.get("/", async (_req, res) => {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { contact: true, conversation: true },
  });
  res.json(leads);
});
