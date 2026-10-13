import { ChangeEvent, useEffect, useRef, useState } from "react";
import { api, ConversationDetail } from "../api/client";

interface Props {
  conversationId: string;
  onContactChange?: () => void;
}

export default function ChatWindow({ conversationId }: Props) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await api.get<ConversationDetail>(`/api/conversations/${conversationId}`);
    setConversation(res.data);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/api/conversations/${conversationId}/reply`, { text });
      setText("");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind = file.type.startsWith("image/") ? "PHOTO" : file.type.startsWith("video/") ? "VIDEO" : "DOCUMENT";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    setSending(true);
    try {
      await api.post(`/api/conversations/${conversationId}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await load();
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function toggleAi() {
    await api.post(`/api/conversations/${conversationId}/toggle-ai`);
    await load();
  }

  if (!conversation) return <div className="chat-window chat-window-empty">Завантаження...</div>;

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div>
          <div className="chat-window-title">{conversation.contact.firstName ?? conversation.contact.username ?? "Клієнт"}</div>
          <div className="chat-window-subtitle">{conversation.channel === "TELEGRAM" ? "Telegram" : "TikTok"}</div>
        </div>
        <button className={`ai-toggle ${conversation.status === "AI_ACTIVE" ? "on" : "off"}`} onClick={toggleAi}>
          {conversation.status === "AI_ACTIVE" ? "AI активний · натисніть щоб взяти чат" : "Веде менеджер · натисніть щоб повернути AI"}
        </button>
      </div>

      <div className="chat-window-messages">
        {conversation.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.direction === "INCOMING" ? "in" : "out"} sender-${m.sender.toLowerCase()}`}>
            {m.sender !== "CLIENT" && <div className="bubble-sender">{m.sender === "AI" ? "Олександр (AI)" : m.sender === "MANAGER" ? "Менеджер" : "Система"}</div>}
            {m.contentType === "TEXT" && <div className="bubble-text">{m.text}</div>}
            {m.contentType === "PHOTO" && m.mediaUrl && (
              <a href={m.mediaUrl} target="_blank" rel="noreferrer">
                <img className="bubble-media" src={m.mediaUrl} alt="" />
              </a>
            )}
            {m.contentType === "VIDEO" && m.mediaUrl && <video className="bubble-media" src={m.mediaUrl} controls />}
            {(m.contentType === "DOCUMENT" || m.contentType === "VOICE" || m.contentType === "AUDIO") && m.mediaUrl && (
              <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="bubble-file">
                📎 Файл
              </a>
            )}
            <div className="bubble-time">{new Date(m.createdAt).toLocaleString("uk-UA")}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-window-composer">
        <button className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Прикріпити фото, відео чи файл">
          📎
        </button>
        <input ref={fileInputRef} type="file" hidden onChange={handleFile} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написати повідомлення клієнту..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button className="send-btn" onClick={handleSend} disabled={sending || !text.trim()}>
          Надіслати
        </button>
      </div>
    </div>
  );
}
