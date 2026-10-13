import { prisma } from "../db/prisma";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function score(query: string, entry: { question: string; answer: string; tags: string[] }): number {
  const q = normalize(query);
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const haystack = normalize(`${entry.question} ${entry.tags.join(" ")}`);
  let s = 0;
  for (const w of words) {
    if (haystack.includes(w)) s += 1;
  }
  if (normalize(entry.question) === q) s += 10;
  return s;
}

/** Найпростіший релевантний пошук по базі знань (ключові слова). Достатньо для невеликого обсягу FAQ. */
export async function searchKnowledgeBase(query: string, limit = 4): Promise<{ question: string; answer: string }[]> {
  const entries = await prisma.knowledgeBaseEntry.findMany();
  const scored = entries
    .map((e) => ({ e, s: score(query, e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit);

  return scored.map(({ e }) => ({ question: e.question, answer: e.answer }));
}

export function formatKnowledgeSnippet(entries: { question: string; answer: string }[]): string {
  if (entries.length === 0) return "";
  return entries.map((e) => `Питання: ${e.question}\nВідповідь: ${e.answer}`).join("\n\n");
}
