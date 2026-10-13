import { prisma } from "../db/prisma";

export interface ProductInfo {
  name: string;
  category: string | null;
  freshPrice: number | null;
  driedPrice: number | null;
  isAvailable: boolean;
  seasonNote: string | null;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/['"`]/g, "").replace(/\s+/g, " ");
}

/** Простий пошук товару за назвою або аліасами (без урахування регістру, часткове співпадіння). */
export async function findProduct(query: string): Promise<ProductInfo | null> {
  const q = normalize(query);
  if (!q) return null;

  const products = await prisma.product.findMany();
  let best: (typeof products)[number] | null = null;
  let bestScore = 0;

  for (const p of products) {
    const candidates = [p.name, ...(p.aliases ?? [])].map(normalize);
    for (const c of candidates) {
      if (!c) continue;
      let score = 0;
      if (c === q) score = 100;
      else if (c.includes(q) || q.includes(c)) score = 70;
      else if (q.split(" ").some((word) => word.length > 3 && c.includes(word))) score = 40;

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
  }

  if (!best || bestScore < 40) return null;

  return {
    name: best.name,
    category: best.category,
    freshPrice: best.freshPrice ? Number(best.freshPrice) : null,
    driedPrice: best.driedPrice ? Number(best.driedPrice) : null,
    isAvailable: best.isAvailable,
    seasonNote: best.seasonNote,
  };
}

export async function listAvailableProducts(): Promise<ProductInfo[]> {
  const products = await prisma.product.findMany({ where: { isAvailable: true }, orderBy: { name: "asc" } });
  return products.map((p) => ({
    name: p.name,
    category: p.category,
    freshPrice: p.freshPrice ? Number(p.freshPrice) : null,
    driedPrice: p.driedPrice ? Number(p.driedPrice) : null,
    isAvailable: p.isAvailable,
    seasonNote: p.seasonNote,
  }));
}
