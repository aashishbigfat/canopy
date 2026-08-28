/**
 * Phase 7 — Messaging (Gmail / Email client / WhatsApp / Chatbot).
 */
import { apiClient } from "@/lib/api/client";

const BASE = "/messaging";

export interface EmailMessage {
  id: string;
  external_id: string;
  thread_id?: string | null;
  from_email?: string | null;
  to_emails: string[];
  subject?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  snippet?: string | null;
  received_at?: string | null;
  seen: boolean;
  starred: boolean;
}

export interface EmailListResponse {
  messages: EmailMessage[];
  total: number;
  page: number;
  per_page: number;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  body: string;
  status: string;
  variables: string[];
}

export interface WhatsAppMessage {
  id: string;
  direction: "in" | "out";
  wa_id: string;
  body?: string | null;
  media_url?: string | null;
  status: string;
  created_at: string;
}

export const messagingService = {
  // GMAIL
  setupGmail: async (payload: any) => (await apiClient.post(`${BASE}/gmail/setup`, payload)).data,
  removeGmail: async () => (await apiClient.post(`${BASE}/gmail/remove`)).data,
  gmailToken: async () => (await apiClient.get(`${BASE}/gmail/token`)).data,
  gmailAuthUrl: async () => (await apiClient.get(`${BASE}/gmail/auth-url`)).data,
  syncGmail: async () => (await apiClient.post(`${BASE}/gmail/sync`)).data,
  listMessages: async (params: any = {}): Promise<EmailListResponse> =>
    (await apiClient.get(`${BASE}/gmail/messages`, { params })).data,
  getMessage: async (id: string): Promise<EmailMessage> =>
    (await apiClient.get(`${BASE}/gmail/messages/${id}`)).data,
  markSeen: async (id: string) =>
    (await apiClient.post(`${BASE}/gmail/messages/${id}/seen`)).data,
  searchGmail: async (q: string): Promise<EmailMessage[]> =>
    (await apiClient.get(`${BASE}/gmail/search`, { params: { q } })).data,

  // CONVERSATIONS
  conversations: async () => (await apiClient.get(`${BASE}/conversations`)).data,

  // WHATSAPP TEMPLATES
  listTemplates: async (): Promise<WhatsAppTemplate[]> =>
    (await apiClient.get(`${BASE}/whatsapp/templates`)).data,
  createTemplate: async (payload: any): Promise<WhatsAppTemplate> =>
    (await apiClient.post(`${BASE}/whatsapp/templates`, payload)).data,
  deleteTemplate: async (id: string) =>
    apiClient.delete(`${BASE}/whatsapp/templates/${id}`),

  // WHATSAPP MESSAGES
  sendWhatsapp: async (payload: any): Promise<WhatsAppMessage> =>
    (await apiClient.post(`${BASE}/whatsapp/messages`, payload)).data,
  listWhatsapp: async (params: any = {}) =>
    (await apiClient.get(`${BASE}/whatsapp/messages`, { params })).data,
  checkWhatsappUser: async (waId: string) =>
    (await apiClient.get(`${BASE}/whatsapp/check-user`, { params: { wa_id: waId } })).data,
};
