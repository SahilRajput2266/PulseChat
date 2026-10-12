import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { WhatsAppSession, WhatsAppSessionStatus, Message, Conversation } from '../types';
import { api } from '../services/api';

interface SocketContextType {
  socket: Socket | null;
  whatsAppSession: WhatsAppSession;
  isConnectingWhatsApp: boolean;
  connectWhatsApp: () => Promise<void>;
  disconnectWhatsApp: () => Promise<void>;
  refreshWhatsAppStatus: () => Promise<void>;
  registerMessageListener: (cb: (msg: Message, conversationId: string) => void) => () => void;
  registerMessageUpdateListener: (cb: (update: { messageId: string; status: any; conversationId: string }) => void) => () => void;
  registerConversationListener: (cb: (conv: Conversation) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [whatsAppSession, setWhatsAppSession] = useState<WhatsAppSession>({
    status: 'disconnected'
  });
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState<boolean>(false);

  // Listener callbacks sets
  const messageListeners = useRef<Set<(msg: Message, conversationId: string) => void>>(new Set());
  const updateListeners = useRef<Set<(update: { messageId: string; status: any; conversationId: string }) => void>>(new Set());
  const conversationListeners = useRef<Set<(conv: Conversation) => void>>(new Set());

  const refreshWhatsAppStatus = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.request<WhatsAppSession>('/whatsapp/status');
      setWhatsAppSession(data);
    } catch {
      // Ignore initial status error
    }
  }, [user]);

  const userId = user?.id;

  // Connect Socket.IO when user is authenticated
  useEffect(() => {
    if (!userId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setWhatsAppSession({ status: 'disconnected' });
      return;
    }

    const token = api.getAccessToken();
    const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : window.location.origin;

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 4000,
      timeout: 15000
    });

    newSocket.on('connect', () => {
      refreshWhatsAppStatus();
    });

    newSocket.on('reconnect', () => {
      refreshWhatsAppStatus();
    });

    newSocket.on('whatsapp:status', (data: Partial<WhatsAppSession>) => {
      setWhatsAppSession(prev => ({
        ...prev,
        ...data,
        // If connected, clear QR code
        qrCode: data.status === 'connected' ? undefined : prev.qrCode
      }));
      setIsConnectingWhatsApp(data.status === 'connecting');
    });

    newSocket.on('whatsapp:qr', (data: { qrCode: string; expiresAt?: string }) => {
      setWhatsAppSession(prev => ({
        ...prev,
        status: 'connecting',
        qrCode: data.qrCode,
        qrExpiresAt: data.expiresAt
      }));
    });

    newSocket.on('message:new', (payload: { message: Message; conversationId: string }) => {
      messageListeners.current.forEach(cb => cb(payload.message, payload.conversationId));
    });

    newSocket.on('message:update', (payload: { messageId: string; status: any; conversationId: string }) => {
      updateListeners.current.forEach(cb => cb(payload));
    });

    newSocket.on('conversation:update', (payload: { conversation: Conversation }) => {
      conversationListeners.current.forEach(cb => cb(payload.conversation));
    });

    setSocket(newSocket);

    // Initial status fetch
    refreshWhatsAppStatus();

    return () => {
      if (newSocket.connected) {
        newSocket.disconnect();
      } else {
        newSocket.once('connect', () => {
          newSocket.disconnect();
        });
        setTimeout(() => {
          if (!newSocket.disconnected) {
            newSocket.disconnect();
          }
        }, 1500);
      }
    };
  }, [userId]);

  const connectWhatsApp = async () => {
    setIsConnectingWhatsApp(true);
    try {
      const result = await api.request<{ status: WhatsAppSessionStatus; qrCode?: string }>('/whatsapp/connect', {
        method: 'POST'
      });
      setWhatsAppSession(prev => ({
        ...prev,
        status: result.status,
        qrCode: result.qrCode || prev.qrCode
      }));
    } catch (err) {
      setIsConnectingWhatsApp(false);
      throw err;
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      await api.request('/whatsapp/disconnect', { method: 'POST' });
      setWhatsAppSession({
        status: 'disconnected',
        disconnectReason: 'User disconnected'
      });
    } catch (err) {
      throw err;
    }
  };

  const registerMessageListener = (cb: (msg: Message, conversationId: string) => void) => {
    messageListeners.current.add(cb);
    return () => {
      messageListeners.current.delete(cb);
    };
  };

  const registerMessageUpdateListener = (cb: (update: { messageId: string; status: any; conversationId: string }) => void) => {
    updateListeners.current.add(cb);
    return () => {
      updateListeners.current.delete(cb);
    };
  };

  const registerConversationListener = (cb: (conv: Conversation) => void) => {
    conversationListeners.current.add(cb);
    return () => {
      conversationListeners.current.delete(cb);
    };
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        whatsAppSession,
        isConnectingWhatsApp,
        connectWhatsApp,
        disconnectWhatsApp,
        refreshWhatsAppStatus,
        registerMessageListener,
        registerMessageUpdateListener,
        registerConversationListener
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
