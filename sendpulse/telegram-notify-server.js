/**
 * Small webhook that notifies the manager in Telegram.
 * SendPulse calls it from Action → Send API request.
 *
 *   npm init -y && npm install express
 *   TELEGRAM_BOT_TOKEN=your-token \
 *   TELEGRAM_NOTIFY_CHAT_ID=your-chat-id \
 *   PORT=4001 node telegram-notify-server.js
 *
 * SendPulse posts to /notify or /webhooks/sendpulse/notify.
 */

const http = require("http");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID || "";
const PORT = Number(process.env.PORT || 4001);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({ raw: data });
      }
    });
    req.on("error", reject);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildSendPulseChatUrl(payload) {
  if (payload.chatUrl) return payload.chatUrl;
  const contactId = payload.contactId || payload.contact_id;
  const botId = payload.botId || payload.bot_id;
  if (!contactId) return null;
  if (botId) {
    return `https://login.sendpulse.com/chatbots/chats?botId=${botId}&contactId=${contactId}`;
  }
  return `https://login.sendpulse.com/chatbots/chats?contactId=${contactId}`;
}

function formatMessage(payload) {
  const name = payload.firstName || payload.name;
  const username = payload.username ? `@${String(payload.username).replace(/^@/, "")}` : null;
  const product = payload.product || payload.productInterest;
  const volume = payload.volumeKg || payload.approxVolumeKg;
  const channel = payload.channel || payload.messenger || "unknown channel";

  const clientLines = [
    name ? `• Name: ${escapeHtml(name)}` : null,
    username ? `• Username: ${escapeHtml(username)}` : null,
    payload.phone ? `• Phone: ${escapeHtml(payload.phone)}` : null,
  ].filter(Boolean);

  const requestLines = [
    product ? `• Product: ${escapeHtml(product)}` : null,
    volume ? `• Volume: ${escapeHtml(volume)} kg` : null,
    payload.location ? `• Location: ${escapeHtml(payload.location)}` : null,
  ].filter(Boolean);

  const blocks = [
    "<b>New lead — Yagidnyk</b>",
    `Channel: ${escapeHtml(channel)}`,
    "",
    clientLines.length ? "<b>Client</b>\n" + clientLines.join("\n") : null,
    requestLines.length ? "<b>Request</b>\n" + requestLines.join("\n") : null,
    payload.summary ? `<b>Summary</b>\n${escapeHtml(payload.summary)}` : null,
  ].filter(Boolean);

  return blocks.join("\n\n");
}

async function sendTelegram(text, chatUrl) {
  if (!BOT_TOKEN || !CHAT_ID) throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_NOTIFY_CHAT_ID are required");

  const body = {
    chat_id: CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (chatUrl) {
    body.reply_markup = {
      inline_keyboard: [[{ text: "Open the chat in SendPulse", url: chatUrl }]],
    };
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(JSON.stringify(data));
  return data;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && (req.url === "/notify" || req.url === "/webhooks/sendpulse/notify")) {
    try {
      const payload = await readBody(req);
      const text = formatMessage(payload);
      const chatUrl = buildSendPulseChatUrl(payload);
      await sendTelegram(text, chatUrl);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error("[notify]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`[notify] Telegram webhook on port ${PORT}`);
  console.log(`[notify] POST http://localhost:${PORT}/notify`);
});
