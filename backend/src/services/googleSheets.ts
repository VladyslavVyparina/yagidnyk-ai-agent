import { google } from "googleapis";
import { env } from "../config/env";
import { prisma } from "../db/prisma";

/**
 * Синхронізація прайсу з Google Таблиці.
 *
 * Колонки визначаються АВТОМАТИЧНО за текстом заголовків у рядку над діапазоном даних —
 * порядок колонок і їх кількість не важливі. Розпізнаються заголовки (регістр не важливий):
 *
 *   Товар / Назва / Назва товару            -> назва (обовʼязково)
 *   Категорія                                -> категорія
 *   Ціна / Ціна суха / Суха                  -> базова ціна (грн/кг)
 *   Ціна свіжа / Свіжа                       -> ціна за свіжу сировину (грн/кг)
 *   Приймається / Доступність / Статус       -> так/ні (за замовчуванням "так", якщо колонки нема)
 *   Примітка / Сезон / Коментар              -> текстова примітка
 *
 * Приклад мінімальної таблиці (як у тестовому аркуші клієнта): колонки "ТОВАР" і "ЦІНА".
 */

const HEADER_ALIASES = {
  name: ["товар", "назва", "назва товару", "продукт"],
  category: ["категорія", "категория", "тип"],
  driedPrice: ["ціна", "ціна суха", "суха", "суха ціна", "ціна (суха)", "price"],
  freshPrice: ["ціна свіжа", "свіжа", "свіжа ціна", "ціна (свіжа)"],
  isAvailable: ["приймається", "доступність", "статус", "в наявності"],
  seasonNote: ["примітка", "сезон", "коментар", "note"],
} as const;

type FieldKey = keyof typeof HEADER_ALIASES;

function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase();
}

function detectColumnMap(headerRow: unknown[]): Partial<Record<FieldKey, number>> {
  const map: Partial<Record<FieldKey, number>> = {};
  headerRow.forEach((cell, idx) => {
    const normalized = normalizeHeader(cell);
    if (!normalized) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [FieldKey, readonly string[]][]) {
      if (field in map) continue;
      if ((aliases as readonly string[]).includes(normalized)) {
        map[field] = idx;
      }
    }
  });
  return map;
}

function getAuth() {
  if (!env.googleSheets.serviceAccountEmail || !env.googleSheets.serviceAccountPrivateKey) {
    return null;
  }
  return new google.auth.JWT({
    email: env.googleSheets.serviceAccountEmail,
    key: env.googleSheets.serviceAccountPrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function parsePrice(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  // Прибираємо все, крім цифр, крапки/коми і мінуса (наприклад "180 грн" -> "180", "1 200,50 грн" -> "1200.50")
  const normalized = String(value)
    .replace(/[^\d.,-]/g, "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  const s = String(value).trim().toLowerCase();
  if (["так", "yes", "true", "1", "y", "+", "є"].includes(s)) return true;
  if (["ні", "нет", "no", "false", "0", "-"].includes(s)) return false;
  return fallback;
}

/**
 * Діапазон в env (GOOGLE_SHEETS_RANGE) вказує на дані БЕЗ заголовка, наприклад "Аркуш1!B3:G1000".
 * Заголовок автоматично зчитується з рядка одразу над початком цього діапазону.
 */
function computeHeaderRange(dataRange: string): string {
  const match = dataRange.match(/^(.*!)?([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/);
  if (!match) return dataRange;
  const [, sheetPrefix = "", colStart, rowStart, colEnd] = match;
  const headerRow = Math.max(1, Number(rowStart) - 1);
  return `${sheetPrefix}${colStart}${headerRow}:${colEnd}${headerRow}`;
}

export async function syncPricesFromGoogleSheets(): Promise<{ updated: number; skipped: number }> {
  const auth = getAuth();
  if (!auth || !env.googleSheets.spreadsheetId) {
    console.warn("[googleSheets] Не налаштовано доступ до Google Таблиці, синхронізація пропущена");
    return { updated: 0, skipped: 0 };
  }

  const sheets = google.sheets({ version: "v4", auth });

  const headerRange = computeHeaderRange(env.googleSheets.range);
  const [headerRes, dataRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: env.googleSheets.spreadsheetId, range: headerRange }),
    sheets.spreadsheets.values.get({ spreadsheetId: env.googleSheets.spreadsheetId, range: env.googleSheets.range }),
  ]);

  const headerRow = headerRes.data.values?.[0] ?? [];
  const columnMap = detectColumnMap(headerRow);

  if (columnMap.name === undefined) {
    // Фолбек: якщо заголовки не розпізнано, вважаємо колонку A діапазону назвою, B — ціною.
    columnMap.name = 0;
    if (columnMap.driedPrice === undefined) columnMap.driedPrice = 1;
    console.warn(
      `[googleSheets] Не вдалося розпізнати заголовок з "Товар" у діапазоні ${headerRange}, використовую колонку A як назву товару`
    );
  }

  const rows = dataRes.data.values ?? [];
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = (row[columnMap.name] ?? "").toString().trim();
    if (!name) {
      skipped++;
      continue;
    }

    const category = columnMap.category !== undefined ? (row[columnMap.category] ?? "").toString().trim() || null : null;
    const freshPrice = columnMap.freshPrice !== undefined ? parsePrice(row[columnMap.freshPrice]) : null;
    const driedPrice = columnMap.driedPrice !== undefined ? parsePrice(row[columnMap.driedPrice]) : null;
    const isAvailable = parseBool(columnMap.isAvailable !== undefined ? row[columnMap.isAvailable] : undefined, true);
    const seasonNote = columnMap.seasonNote !== undefined ? (row[columnMap.seasonNote] ?? "").toString().trim() || null : null;

    await prisma.product.upsert({
      where: { name },
      create: {
        name,
        category,
        freshPrice: freshPrice ?? undefined,
        driedPrice: driedPrice ?? undefined,
        isAvailable,
        seasonNote,
        rawRow: row,
      },
      update: {
        category,
        freshPrice: freshPrice ?? undefined,
        driedPrice: driedPrice ?? undefined,
        isAvailable,
        seasonNote,
        rawRow: row,
      },
    });
    updated++;
  }

  console.log(`[googleSheets] Синхронізовано товарів: ${updated}, пропущено рядків: ${skipped}`);
  return { updated, skipped };
}
