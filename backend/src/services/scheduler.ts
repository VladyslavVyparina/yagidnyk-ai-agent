import cron from "node-cron";
import { env } from "../config/env";
import { syncPricesFromGoogleSheets } from "./googleSheets";
import { notifyClientsAboutAvailableProducts } from "./pendingInterest";

export function startScheduler() {
  if (!env.googleSheets.spreadsheetId) {
    console.warn("[scheduler] Google Sheets не налаштовано, автоматична синхронізація цін вимкнена");
    return;
  }

  cron.schedule(env.googleSheets.syncCron, async () => {
    try {
      await syncPricesFromGoogleSheets();
      await notifyClientsAboutAvailableProducts();
    } catch (err) {
      console.error("[scheduler] Помилка синхронізації цін:", err);
    }
  });

  console.log(`[scheduler] Синхронізація Google Таблиці запланована за розкладом: ${env.googleSheets.syncCron}`);
}
