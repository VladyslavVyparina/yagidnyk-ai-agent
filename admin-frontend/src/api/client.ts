import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("yagidnyk_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("yagidnyk_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export type Channel = "TELEGRAM" | "TIKTOK";
export type ConversationStatus = "AI_ACTIVE" | "HANDED_OFF" | "CLOSED";

export interface ContactSummary {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

export interface ConversationSummary {
  id: string;
  channel: Channel;
  status: ConversationStatus;
  lastMessageAt: string;
  contact: ContactSummary;
  lastMessage: { text: string | null; contentType: string; direction: "INCOMING" | "OUTGOING"; createdAt: string } | null;
}

export interface MessageItem {
  id: string;
  direction: "INCOMING" | "OUTGOING";
  sender: "CLIENT" | "AI" | "MANAGER" | "SYSTEM";
  contentType: string;
  text: string | null;
  mediaUrl: string | null;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: MessageItem[];
  contactId: string;
}
