import OpenAI from "openai";
import { Channel, Message as DbMessage } from "@prisma/client";
import { env } from "../config/env";
import { buildSystemPrompt } from "./systemPrompt";
import { TOOL_DEFINITIONS, executeTool } from "./tools";
import { searchKnowledgeBase, formatKnowledgeSnippet } from "../services/knowledgeBase";

const openai = new OpenAI({ apiKey: env.openaiApiKey });

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface AgentRunResult {
  replyText: string;
  handedOff: boolean;
}

function mapHistoryToChatMessages(history: DbMessage[]): ChatMessage[] {
  return history
    .filter((m) => m.text && m.text.trim().length > 0)
    .map((m): ChatMessage => {
      if (m.direction === "INCOMING") {
        return { role: "user", content: m.text ?? "" };
      }
      return { role: "assistant", content: m.text ?? "" };
    });
}

export async function runAgent(params: {
  contactId: string;
  conversationId: string;
  channel: Channel;
  history: DbMessage[];
  incomingText: string;
}): Promise<AgentRunResult> {
  if (!env.openaiApiKey) {
    console.warn("[agent] OPENAI_API_KEY не задано, повертаю заглушку відповіді");
    return {
      replyText: "Доброго дня! Зараз уточню інформацію і повернусь з відповіддю.",
      handedOff: false,
    };
  }

  const kbResults = await searchKnowledgeBase(params.incomingText);
  const systemPrompt = buildSystemPrompt(formatKnowledgeSnippet(kbResults));

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...mapHistoryToChatMessages(params.history),
    { role: "user", content: params.incomingText },
  ];

  let handedOff = false;
  const maxIterations = 4;

  for (let i = 0; i < maxIterations; i++) {
    const completion = await openai.chat.completions.create({
      model: env.openaiModel,
      messages,
      tools: TOOL_DEFINITIONS,
      temperature: 0.6,
    });

    const choice = completion.choices[0];
    const message = choice.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      });

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== "function") continue;
        const result = await executeTool(toolCall.function.name, toolCall.function.arguments, {
          contactId: params.contactId,
          conversationId: params.conversationId,
          channel: params.channel,
        });
        if (result.handedOff) handedOff = true;

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.content,
        });
      }
      continue;
    }

    const replyText = message.content?.trim() || "Перевірю це і повернусь з відповіддю найближчим часом.";
    return { replyText, handedOff };
  }

  return {
    replyText: "Перевірю деталі і повернусь з відповіддю найближчим часом.",
    handedOff,
  };
}
