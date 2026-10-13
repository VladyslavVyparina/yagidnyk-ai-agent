import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

// Сформовано на основі реальних переписок компанії з клієнтами (наданих замовником як приклади).
const FAQ_SEED: { question: string; answer: string; tags: string[] }[] = [
  {
    question: "Які умови відправки поштою (Новою поштою)?",
    answer:
      "Заготівельник самостійно сушить і пакує сировину, трамбує в мішки (окрім дуже крихкої сушеної сировини, яку трамбувати не можна), і відправляє на відділення Нової пошти. Перед відправкою обовʼязково потрібно надіслати фото сировини і вказати орієнтовний обʼєм у кг — тоді ми узгоджуємо умови доставки.",
    tags: ["доставка", "нова пошта", "пакування", "мішки", "фото"],
  },
  {
    question: "Який мінімальний обʼєм для відправки поштою?",
    answer:
      "Мінімальний обʼєм залежить від конкретного виду сировини. Орієнтовно від 20-25 кг для більшості трав (уточнюється по товару). Якщо обʼєм ще невеликий і сировина досушується — це нормально, менеджер підкаже умови, коли буде хоча б орієнтовний обʼєм.",
    tags: ["обʼєм", "мінімум", "доставка", "кг"],
  },
  {
    question: "Яка умова, щоб представник компанії приїхав і забрав сировину особисто (самовивіз)?",
    answer:
      "Для самовивозу потрібен значно більший обʼєм, орієнтовно від 1 тонни (мінімум уточнюється по конкретній сировині). Для менших обсягів зручніше й швидше відправити Новою поштою.",
    tags: ["самовивіз", "тонна", "обʼєм", "приїхати"],
  },
  {
    question: "Чи можна привезти сировину особисто на пункт прийому?",
    answer:
      "Так, фізичний пункт прийому знаходиться у Вознесенську, Миколаївська область. Можна привезти самостійно.",
    tags: ["самовивіз", "адреса", "вознесенськ", "пункт прийому"],
  },
  {
    question: "Хто оплачує пересилку Новою поштою і чи можна адресу відділення?",
    answer:
      "Перед відправкою потрібно надіслати фото сировини і вказати обʼєм — після цього ми вирішуємо питання з доставкою і адресою відділення індивідуально.",
    tags: ["оплата", "доставка", "пересилка", "адреса", "нова пошта"],
  },
  {
    question: "Чи приймаєте гілки хвойних (сосна)?",
    answer: "Ні, гілки сосни та інших хвойних компанія не приймає.",
    tags: ["сосна", "хвоя", "гілки"],
  },
  {
    question: "Чи приймаєте насіння гарбуза?",
    answer: "Ні, насіння гарбуза компанія не приймає.",
    tags: ["насіння", "гарбуз"],
  },
  {
    question: "Чи приймаєте цвіт деревію окремо?",
    answer: "Цвіт деревію окремо не приймаємо — деревій приймаємо травою (стебло з суцвіттям разом), а не лише цвіт.",
    tags: ["деревій", "цвіт", "трава"],
  },
  {
    question: "Як потрібно складати сировину в мішки, чи трамбувати?",
    answer:
      "Так, сировину потрібно трамбувати в мішках, окрім дуже крихкої сушеної сировини (наприклад дрібні висушені гілочки чи суцвіття) — таку трамбувати не можна, щоб вона не перетворилась на пил.",
    tags: ["мішки", "трамбування", "пакування"],
  },
  {
    question: "Як правильно робити зріз рослини перед сушінням (наприклад пижмо)?",
    answer:
      "Залежить від конкретної рослини — за замовчуванням для трав зазвичай зрізають все стебло разом із суцвіттям/цвітом, а не лише суцвіття окремо. Для нестандартних випадків краще уточнити у менеджера саме по цій позиції.",
    tags: ["зріз", "пижмо", "заготівля", "стебло"],
  },
  {
    question: "Що потрібно вказати перед відправкою, щоб узгодити прийом?",
    answer:
      "Перед відправкою потрібно розуміти: яку саме сировину заготовляєте, орієнтовний обʼєм у кг, і звідки ви (місто/область) — це впливає на спосіб доставки (пошта чи самовивіз).",
    tags: ["умови", "об'єм", "локація", "заготівля"],
  },
];

// Демонстраційні позиції прайсу — використовуються лише якщо Google Таблиця ще не підключена.
// Після підключення GOOGLE_SHEETS_SPREADSHEET_ID ці дані автоматично оновлюються реальними цінами.
const DEMO_PRODUCTS: {
  name: string;
  category: string;
  freshPrice?: number;
  driedPrice?: number;
  isAvailable: boolean;
  seasonNote?: string;
}[] = [
  { name: "Полин", category: "трава", freshPrice: 10, driedPrice: 50, isAvailable: true },
  { name: "Подорожник лист", category: "трава", isAvailable: true, seasonNote: "Ціна уточнюється менеджером" },
  { name: "Хвощ польовий", category: "трава", isAvailable: true, seasonNote: "Ціна уточнюється менеджером" },
  { name: "Листя горіха", category: "листя", isAvailable: true },
  { name: "Туя", category: "гілки", isAvailable: true, seasonNote: "Приймається сушена, менше деревʼяної частини" },
  { name: "Деревій", category: "трава", isAvailable: true, seasonNote: "Приймається травою, не лише цвіт" },
];

async function seedAdmin() {
  if (!env.adminEmail || !env.adminPassword) {
    console.warn("[seed] ADMIN_EMAIL/ADMIN_PASSWORD не задано, адмін не створено");
    return;
  }

  const existing = await prisma.adminUser.findUnique({ where: { email: env.adminEmail.toLowerCase() } });
  if (existing) {
    console.log(`[seed] Адмін ${env.adminEmail} вже існує`);
    return;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  await prisma.adminUser.create({
    data: { email: env.adminEmail.toLowerCase().trim(), passwordHash },
  });
  console.log(`[seed] Створено адмін-акаунт ${env.adminEmail}`);
}

async function seedKnowledgeBase() {
  const count = await prisma.knowledgeBaseEntry.count();
  if (count > 0) {
    console.log("[seed] База знань вже наповнена, пропускаю базовий FAQ");
    return;
  }

  for (const entry of FAQ_SEED) {
    await prisma.knowledgeBaseEntry.create({ data: { ...entry, source: "faq-import" } });
  }
  console.log(`[seed] Додано ${FAQ_SEED.length} базових записів у базу знань`);
}

async function seedDemoProducts() {
  const count = await prisma.product.count();
  if (count > 0) {
    console.log("[seed] Прайс вже наповнено, пропускаю демо-товари");
    return;
  }

  for (const p of DEMO_PRODUCTS) {
    await prisma.product.create({
      data: {
        name: p.name,
        category: p.category,
        freshPrice: p.freshPrice,
        driedPrice: p.driedPrice,
        isAvailable: p.isAvailable,
        seasonNote: p.seasonNote,
      },
    });
  }
  console.log(`[seed] Додано ${DEMO_PRODUCTS.length} демо-товарів (замінюються реальними після підключення Google Sheets)`);
}

async function main() {
  await seedAdmin();
  await seedKnowledgeBase();
  await seedDemoProducts();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[seed] Помилка:", err);
  process.exit(1);
});
