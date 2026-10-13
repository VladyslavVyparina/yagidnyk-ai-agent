import { createServer } from "./server";
import { env } from "./config/env";
import { launchTelegramClientBot } from "./channels/telegram/bot";
import { startScheduler } from "./services/scheduler";

async function main() {
  const app = createServer();

  app.listen(env.port, () => {
    console.log(`[server] Backend запущено на порту ${env.port}`);
  });

  await launchTelegramClientBot();
  startScheduler();

  process.once("SIGINT", () => process.exit(0));
  process.once("SIGTERM", () => process.exit(0));
}

main().catch((err) => {
  console.error("[bootstrap] Критична помилка запуску:", err);
  process.exit(1);
});
