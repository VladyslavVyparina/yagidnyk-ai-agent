import { useEffect, useState } from "react";
import { api } from "../api/client";

interface ContactDetail {
  id: string;
  channel: "TELEGRAM" | "TIKTOK";
  externalId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  notes: string | null;
  createdAt: string;
  pendingInterests: { id: string; productName: string; notified: boolean }[];
  leads: { id: string; productInterest: string | null; approxVolumeKg: string | null; status: string }[];
}

export default function ContactCard({ contactId }: { contactId: string }) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<ContactDetail>(`/api/contacts/${contactId}`).then((res) => {
      setContact(res.data);
      setNotes(res.data.notes ?? "");
    });
  }, [contactId]);

  async function saveNotes() {
    setSaving(true);
    try {
      await api.patch(`/api/contacts/${contactId}`, { notes });
    } finally {
      setSaving(false);
    }
  }

  if (!contact) return <div className="contact-card">Завантаження...</div>;

  return (
    <div className="contact-card">
      <div className="contact-card-header">
        {contact.avatarUrl ? <img src={contact.avatarUrl} alt="" className="contact-avatar" /> : <div className="contact-avatar placeholder">{(contact.firstName ?? "?")[0]}</div>}
        <div className="contact-name">{contact.firstName ?? "Без імені"} {contact.lastName ?? ""}</div>
        <div className="contact-channel">{contact.channel === "TELEGRAM" ? "Telegram" : "TikTok"}</div>
      </div>

      <div className="contact-field">
        <span className="label">Нік</span>
        <span className="value">{contact.username ? `@${contact.username}` : "—"}</span>
      </div>
      <div className="contact-field">
        <span className="label">ID в каналі</span>
        <span className="value">{contact.externalId}</span>
      </div>
      <div className="contact-field">
        <span className="label">Телефон</span>
        <span className="value">{contact.phone ?? "не надано"}</span>
      </div>
      {contact.profileUrl && (
        <div className="contact-field">
          <span className="label">Профіль</span>
          <a className="value" href={contact.profileUrl} target="_blank" rel="noreferrer">
            Відкрити
          </a>
        </div>
      )}
      <div className="contact-field">
        <span className="label">В базі з</span>
        <span className="value">{new Date(contact.createdAt).toLocaleDateString("uk-UA")}</span>
      </div>

      {contact.pendingInterests.length > 0 && (
        <div className="contact-section">
          <h4>Очікує на товар</h4>
          {contact.pendingInterests.map((p) => (
            <div key={p.id} className="tag">
              {p.productName} {p.notified ? "(сповіщено)" : ""}
            </div>
          ))}
        </div>
      )}

      {contact.leads.length > 0 && (
        <div className="contact-section">
          <h4>Ліди</h4>
          {contact.leads.map((l) => (
            <div key={l.id} className="tag">
              {l.productInterest ?? "товар не вказано"} {l.approxVolumeKg ? `· ${l.approxVolumeKg} кг` : ""} · {l.status}
            </div>
          ))}
        </div>
      )}

      <div className="contact-section">
        <h4>Нотатки менеджера</h4>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Приватні нотатки..." />
        {saving && <span className="saving-indicator">Збереження...</span>}
      </div>
    </div>
  );
}
