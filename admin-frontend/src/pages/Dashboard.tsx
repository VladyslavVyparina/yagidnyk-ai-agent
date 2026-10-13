import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import ContactCard from "../components/ContactCard";
import { api } from "../api/client";

export default function Dashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSelect(id: string) {
    setSelectedId(id);
    const res = await api.get(`/api/conversations/${id}`);
    setSelectedContactId(res.data.contactId ?? res.data.contact?.id ?? null);
  }

  function logout() {
    localStorage.removeItem("yagidnyk_token");
    navigate("/login");
  }

  return (
    <div className="dashboard">
      <div className="dashboard-sidebar">
        <div className="brand">🌿 Ягідник</div>
        <nav>
          <div className="nav-item active">Чати</div>
        </nav>
        <button className="logout-btn" onClick={logout}>
          Вийти
        </button>
      </div>

      <ChatList selectedId={selectedId} onSelect={handleSelect} />

      {selectedId ? <ChatWindow conversationId={selectedId} /> : <div className="chat-window chat-window-empty">Оберіть діалог зі списку</div>}

      {selectedContactId ? <ContactCard contactId={selectedContactId} /> : <div className="contact-card contact-card-empty">Дані клієнта зʼявляться тут</div>}
    </div>
  );
}
