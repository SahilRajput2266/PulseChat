export type ThemeMode = 'dark' | 'light' | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  themePreference: ThemeMode;
  createdAt?: string;
}

export type WhatsAppSessionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WhatsAppSession {
  status: WhatsAppSessionStatus;
  phoneNumber?: string;
  pushName?: string;
  jid?: string;
  qrCode?: string;
  qrExpiresAt?: string;
  lastConnectedAt?: string;
  disconnectReason?: string;
  error?: string;
}

export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Contact {
  _id: string;
  userId: string;
  phoneNumber: string;
  jid: string;
  lid?: string;
  name: string;
  avatarUrl?: string;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Conversation {
  _id: string;
  userId: string;
  contactId?: string;
  jid: string;
  lid?: string;
  phoneNumber: string;
  name: string;
  avatarUrl?: string;
  unreadCount: number;
  lastMessagePreview?: string;
  lastMessageTimestamp?: string;
  lastMessageStatus?: MessageStatus;
  lastMessageDirection?: MessageDirection;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  _id: string;
  userId: string;
  conversationId: string;
  jid: string;
  messageId: string;
  direction: MessageDirection;
  text: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'none';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  caption?: string;
  status: MessageStatus;
  timestamp: string;
  errorMessage?: string;
  retryCount?: number;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}
