import { Router } from "express";
import { prisma } from "../../db/prisma";
import { syncPricesFromGoogleSheets } from "../../services/googleSheets";
import { notifyClientsAboutAvailableProducts } from "../../services/pendingInterest";

export const productsRouter = Router();

productsRouter.get("/", async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  res.json(products);
});

productsRouter.post("/sync", async (_req, res) => {
  try {
    const result = await syncPricesFromGoogleSheets();
    await notifyClientsAboutAvailableProducts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
