import { useEffect, useState } from "react";
import { api, Channel, ConversationSummary } from "../api/client";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const CHANNEL_LABEL: Record<Channel, string> = { TELEGRAM: "Telegram", TIKTOK: "TikTok" };
const CHANNEL_ICON: Record<Channel, string> = { TELEGRAM: "✈️", TIKTOK: "🎵" };

export default function ChatList({ selectedId, onSelect }: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [channelFilter, setChannelFilter] = useState<Channel | "ALL">("ALL");
  const [search, setSearch] = useState("");

  async function load() {
    const params: Record<string, string> = {};
    if (channelFilter !== "ALL") params.channel = channelFilter;
    const res = await api.get<ConversationSummary[]>("/api/conversations", { params });
    setConversations(res.data);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelFilter]);

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.contact.firstName?.toLowerCase().includes(q) ||
      c.contact.username?.toLowerCase().includes(q) ||
      c.contact.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Чати</h2>
        <input
          className="chat-search"
          placeholder="Пошук за імʼям, ніком, телефоном"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="channel-tabs">
          {(["ALL", "TELEGRAM", "TIKTOK"] as const).map((ch) => (
            <button key={ch} className={channelFilter === ch ? "active" : ""} onClick={() => setChannelFilter(ch)}>
              {ch === "ALL" ? "Усі" : CHANNEL_LABEL[ch]}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-list-items">
        {filtered.length === 0 && <div className="chat-list-empty">Немає активних діалогів</div>}
        {filtered.map((c) => (
          <div key={c.id} className={`chat-list-item ${selectedId === c.id ? "selected" : ""}`} onClick={() => onSelect(c.id)}>
            <div className="chat-avatar">
              {c.contact.avatarUrl ? <img src={c.contact.avatarUrl} alt="" /> : <span>{(c.contact.firstName ?? "?")[0]}</span>}
              <span className="channel-badge">{CHANNEL_ICON[c.channel]}</span>
            </div>
            <div className="chat-list-item-body">
              <div className="chat-list-item-top">
                <span className="chat-name">{c.contact.firstName ?? c.contact.username ?? "Без імені"}</span>
                <span className="chat-time">{new Date(c.lastMessageAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="chat-list-item-bottom">
                <span className="chat-preview">
                  {c.lastMessage?.contentType !== "TEXT" && c.lastMessage ? "📎 Медіафайл" : c.lastMessage?.text ?? "—"}
                </span>
                {c.status === "HANDED_OFF" && <span className="status-pill handed-off">Менеджер</span>}
                {c.status === "AI_ACTIVE" && <span className="status-pill ai">AI</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
