import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    console.warn(`[config] Змінна оточення ${name} не встановлена`);
    return "";
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  adminPanelOrigin: process.env.ADMIN_PANEL_ORIGIN ?? "*",

  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",

  telegram: {
    clientBotToken: process.env.TELEGRAM_CLIENT_BOT_TOKEN ?? "",
    mode: (process.env.TELEGRAM_CLIENT_BOT_MODE ?? "polling") as "polling" | "webhook",
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL ?? "",
    notifyBotToken: process.env.TELEGRAM_NOTIFY_BOT_TOKEN ?? "",
    notifyChatId: process.env.TELEGRAM_NOTIFY_CHAT_ID ?? "",
  },

  tiktok: {
    appId: process.env.TIKTOK_APP_ID ?? "",
    appSecret: process.env.TIKTOK_APP_SECRET ?? "",
    accessToken: process.env.TIKTOK_ACCESS_TOKEN ?? "",
    businessId: process.env.TIKTOK_BUSINESS_ID ?? "",
    webhookVerifyToken: process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN ?? "",
  },

  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "",
    range: process.env.GOOGLE_SHEETS_RANGE ?? "Аркуш1!B3:G1000",
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
    serviceAccountPrivateKey: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    syncCron: process.env.GOOGLE_SHEETS_SYNC_CRON ?? "*/15 * * * *",
  },

  media: {
    storagePath: process.env.MEDIA_STORAGE_PATH ?? "./uploads",
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:4000",
  },
};
