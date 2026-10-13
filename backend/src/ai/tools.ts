import type OpenAI from "openai";
import { Channel } from "@prisma/client";
import { findProduct } from "../services/productLookup";
import { searchKnowledgeBase } from "../services/knowledgeBase";
import { savePendingInterest } from "../services/pendingInterest";
import { createLeadAndNotify } from "../services/leads";
import { prisma } from "../db/prisma";

export const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_product_price",
      description:
        "Отримати актуальну ціну та умови прийому конкретного виду сировини (трава, ягода, квітка, корінь тощо) з поточного прайсу. Використовуй завжди, коли клієнт питає про ціну або чи приймається товар.",
      parameters: {
        type: "object",
        properties: {
          product_name: {
            type: "string",
            description: "Назва сировини, як її назвав клієнт, наприклад 'полин', 'листя горіха', 'подорожник'",
          },
        },
        required: ["product_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description:
        "Пошук відповіді в базі знань компанії (типові питання-відповіді про умови, пакування, доставку, правила прийому). Використовуй, коли питання не про конкретну ціну товару.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Суть питання клієнта" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_pending_interest",
      description:
        "Зберегти інтерес клієнта до товару, якого зараз немає в прайсі (несезон/тимчасово не приймається), щоб автоматично нагадати клієнту, коли товар зʼявиться.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Назва товару, яким цікавився клієнт" },
          note: { type: "string", description: "Додатковий контекст запиту, якщо є" },
        },
        required: ["product_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description:
        "Зафіксувати кваліфікований лід і передати діалог живому менеджеру Роману, коли запит зрозумілий, є контакт клієнта і клієнт готовий рухатись далі (здавати сировину). Після виклику AI більше не веде цю розмову.",
      parameters: {
        type: "object",
        properties: {
          product_interest: { type: "string", description: "Яка сировина цікавить клієнта" },
          approx_volume_kg: { type: "string", description: "Орієнтовний обʼєм у кг, якщо відомий" },
          summary: { type: "string", description: "Короткий підсумок запиту для менеджера, 1-2 речення" },
        },
        required: ["summary"],
      },
    },
  },
];

export interface ToolExecutionContext {
  contactId: string;
  conversationId: string;
  channel: Channel;
}

export interface ToolExecutionResult {
  toolName: string;
  content: string;
  handedOff?: boolean;
}

export async function executeTool(
  name: string,
  rawArgs: string,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    args = {};
  }

  switch (name) {
    case "get_product_price": {
      const productName = String(args.product_name ?? "");
      const product = await findProduct(productName);
      if (!product) {
        return {
          toolName: name,
          content: `Товар "${productName}" не знайдено в поточному прайсі. Ймовірно, він зараз не приймається (несезон або пауза). Запропонуй клієнту зберегти інтерес через save_pending_interest.`,
        };
      }
      return {
        toolName: name,
        content: JSON.stringify({
          name: product.name,
          category: product.category,
          fresh_price_uah_per_kg: product.freshPrice,
          dried_price_uah_per_kg: product.driedPrice,
          is_available: product.isAvailable,
          season_note: product.seasonNote,
        }),
      };
    }

    case "search_knowledge_base": {
      const query = String(args.query ?? "");
      const results = await searchKnowledgeBase(query);
      if (results.length === 0) {
        return { toolName: name, content: "У базі знань не знайдено релевантної інформації по цьому питанню." };
      }
      return { toolName: name, content: JSON.stringify(results) };
    }

    case "save_pending_interest": {
      const productName = String(args.product_name ?? "");
      const note = args.note ? String(args.note) : undefined;
      await savePendingInterest(ctx.contactId, productName, note);
      return { toolName: name, content: "Інтерес клієнта збережено, нагадування надішлеться автоматично." };
    }

    case "create_lead": {
      const contact = await prisma.contact.findUnique({ where: { id: ctx.contactId } });
      await createLeadAndNotify({
        contactId: ctx.contactId,
        conversationId: ctx.conversationId,
        channel: ctx.channel,
        productInterest: args.product_interest ? String(args.product_interest) : undefined,
        approxVolumeKg: args.approx_volume_kg ? String(args.approx_volume_kg) : undefined,
        summary: args.summary ? String(args.summary) : undefined,
      });
      return {
        toolName: name,
        content: `Лід зафіксовано і передано менеджеру. Контакт клієнта: ${contact?.phone ?? contact?.username ?? "уточнюється"}.`,
        handedOff: true,
      };
    }

    default:
      return { toolName: name, content: "Невідома функція." };
  }
}
