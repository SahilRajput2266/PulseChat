import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { ConversationList } from '../chat/ConversationList';
import { ChatArea } from '../chat/ChatArea';
import { MediaPayload } from '../chat/MessageComposer';
import { ConnectWhatsAppModal } from '../chat/ConnectWhatsAppModal';
import { SettingsModal } from '../settings/SettingsModal';
import { NewConversationModal } from '../chat/NewConversationModal';
import { ContactsModal } from '../contacts/ContactsModal';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { Conversation, Message } from '../../types';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const {
    whatsAppSession,
    registerMessageListener,
    registerMessageUpdateListener,
    registerConversationListener
  } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);

  // Show onboarding if never completed
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('pulsechat_onboarding_done') !== 'true';
  });

  // Mobile layout state: show list or chat
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async (searchQuery = '') => {
    try {
      const endpoint = searchQuery ? `/conversations?search=${encodeURIComponent(searchQuery)}` : '/conversations';
      const data = await api.request<{ conversations: Conversation[] }>(endpoint);
      setConversations(data.conversations);
    } catch {
      // Ignore
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations(searchTerm);
  }, [fetchConversations, searchTerm]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (jid: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await api.request<{ messages: Message[] }>(`/conversations/${encodeURIComponent(jid)}/messages`);
      const seen = new Set<string>();
      const deduped = data.messages.filter((m: Message) => {
        const key = m.messageId || m._id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setMessages(deduped);

      // Decrement unread locally
      setConversations((prev) =>
        prev.map((c) => (c.jid === jid ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      // Ignore
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setIsMobileChatOpen(true);
    fetchMessages(conversation.jid);
  };

  const activeConversationRef = useRef<Conversation | null>(activeConversation);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const searchTermRef = useRef<string>(searchTerm);
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  // Register real-time socket listeners
  useEffect(() => {
    const unregisterMsg = registerMessageListener((newMsg, conversationId) => {
      const active = activeConversationRef.current;
      const convIdStr = String(conversationId || newMsg.conversationId || '');
      const activeIdStr = active ? String(active._id || '') : '';

      // Match by ID, JID, LID, or phone digits
      const isForActiveChat = Boolean(
        active && (
          (activeIdStr && convIdStr && activeIdStr === convIdStr) ||
          active.jid === newMsg.jid ||
          (active.lid && active.lid === newMsg.jid) ||
          (newMsg.jid && active.phoneNumber && newMsg.jid.includes(active.phoneNumber.replace(/\D/g, '')))
        )
      );

      if (isForActiveChat) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id || m.messageId === newMsg.messageId)) {
            return prev;
          }

          // If outbound and matches an optimistic temp message, reconcile in-place
          if (newMsg.direction === 'outbound') {
            const tempIdx = prev.findIndex(
              (m) => m._id.startsWith('temp_') && m.text.trim() === newMsg.text.trim()
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = newMsg;
              return next;
            }
          }

          return [...prev, newMsg];
        });
      }

      // Update sidebar state immediately with zero delay
      setConversations((prev) =>
        prev.map((c) => {
          const cId = String(c._id || '');
          if (
            (convIdStr && cId === convIdStr) ||
            c.jid === newMsg.jid ||
            (c.lid && c.lid === newMsg.jid)
          ) {
            return {
              ...c,
              lastMessagePreview: newMsg.text,
              lastMessageTimestamp: newMsg.timestamp,
              lastMessageStatus: newMsg.status,
              lastMessageDirection: newMsg.direction,
              unreadCount: isForActiveChat ? 0 : c.unreadCount + (newMsg.direction === 'inbound' ? 1 : 0)
            };
          }
          return c;
        })
      );

      // Background re-fetch to ensure list order is synchronized
      fetchConversations(searchTermRef.current);
    });

    const unregisterUpdate = registerMessageUpdateListener(({ messageId, status, conversationId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.messageId === messageId ? { ...m, status } : m))
      );

      // Immediately reflect updated message status (e.g. double tick) in sidebar
      setConversations((prev) =>
        prev.map((c) => {
          const cId = String(c._id || '');
          if (
            (conversationId && cId === String(conversationId)) ||
            (activeConversationRef.current && cId === String(activeConversationRef.current._id))
          ) {
            return {
              ...c,
              lastMessageStatus: status
            };
          }
          return c;
        })
      );
    });

    const unregisterConv = registerConversationListener((updatedConv) => {
      if (updatedConv) {
        setConversations((prev) =>
          prev.map((c) => (String(c._id || '') === String(updatedConv._id || '') ? { ...c, ...updatedConv } : c))
        );
      }
      fetchConversations(searchTermRef.current);
    });

    return () => {
      unregisterMsg();
      unregisterUpdate();
      unregisterConv();
    };
  }, [
    registerMessageListener,
    registerMessageUpdateListener,
    registerConversationListener,
    fetchConversations
  ]);

  // Send manual message handler
  const handleSendMessage = async (text: string) => {
    if (!activeConversation) return;

    // Optimistic pending message
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      _id: tempId,
      userId: user!.id,
      conversationId: activeConversation._id,
      jid: activeConversation.jid,
      messageId: tempId,
      direction: 'outbound',
      text,
      status: 'sending',
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Optimistically update conversation in sidebar
    setConversations((prev) =>
      prev.map((c) =>
        c._id === activeConversation._id
          ? {
              ...c,
              lastMessagePreview: text,
              lastMessageTimestamp: optimisticMessage.timestamp,
              lastMessageStatus: 'sending',
              lastMessageDirection: 'outbound'
            }
          : c
      )
    );

    try {
      const res = await api.request<{ data: Message; conversation?: Conversation }>('/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: activeConversation._id,
          recipientPhone: activeConversation.phoneNumber || activeConversation.jid,
          text
        })
      });

      // Replace optimistic message with actual persisted message, avoiding duplicates if socket already arrived
      setMessages((prev) => {
        const alreadyPresent = prev.some(
          (m) => (m._id === res.data._id || m.messageId === res.data.messageId) && m._id !== tempId
        );
        if (alreadyPresent) {
          return prev.filter((m) => m._id !== tempId);
        }
        return prev.map((m) => (m._id === tempId ? res.data : m));
      });

      if (res.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c._id === res.conversation!._id ? { ...c, ...res.conversation } : c))
        );
      }

      // Refresh conversations
      fetchConversations(searchTerm);
    } catch (err) {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: 'failed' } : m))
      );
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConversation._id
            ? { ...c, lastMessageStatus: 'failed' }
            : c
        )
      );
      throw err;
    }
  };

  // Send media message handler
  const handleSendMedia = async (payload: MediaPayload) => {
    if (!activeConversation) return;

    const tempId = `temp_${Date.now()}`;
    const previewText =
      payload.caption ||
      (payload.mediaType === 'image'
        ? '📷 Photo'
        : payload.mediaType === 'document'
        ? `📄 ${payload.fileName}`
        : '[Attachment]');

    // Local preview for image
    const localMediaUrl = payload.file.type.startsWith('image/')
      ? URL.createObjectURL(payload.file)
      : undefined;

    const optimisticMessage: Message = {
      _id: tempId,
      userId: user!.id,
      conversationId: activeConversation._id,
      jid: activeConversation.jid,
      messageId: tempId,
      direction: 'outbound',
      text: previewText,
      mediaType: payload.mediaType,
      mediaUrl: localMediaUrl,
      fileName: payload.fileName,
      fileSize: payload.file.size,
      caption: payload.caption,
      status: 'sending',
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Optimistically update conversation in sidebar
    setConversations((prev) =>
      prev.map((c) =>
        c._id === activeConversation._id
          ? {
              ...c,
              lastMessagePreview: previewText,
              lastMessageTimestamp: optimisticMessage.timestamp,
              lastMessageStatus: 'sending',
              lastMessageDirection: 'outbound'
            }
          : c
      )
    );

    try {
      const res = await api.request<{ data: Message; conversation?: Conversation }>('/messages/send-media', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: activeConversation._id,
          recipientPhone: activeConversation.phoneNumber || activeConversation.jid,
          mediaBase64: payload.base64,
          mediaType: payload.mediaType,
          caption: payload.caption,
          fileName: payload.fileName,
          mimetype: payload.mimetype
        })
      });

      // Replace optimistic message with actual persisted message
      setMessages((prev) => {
        const alreadyPresent = prev.some(
          (m) => (m._id === res.data._id || m.messageId === res.data.messageId) && m._id !== tempId
        );
        if (alreadyPresent) {
          return prev.filter((m) => m._id !== tempId);
        }
        return prev.map((m) => (m._id === tempId ? res.data : m));
      });

      if (res.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c._id === res.conversation!._id ? { ...c, ...res.conversation } : c))
        );
      }

      fetchConversations(searchTerm);
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: 'failed' } : m))
      );
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConversation._id
            ? { ...c, lastMessageStatus: 'failed' }
            : c
        )
      );
      throw err;
    }
  };

  // Retry message
  const handleRetryMessage = async (messageId: string) => {
    const failedMsg = messages.find((m) => m._id === messageId || m.messageId === messageId);
    if (!failedMsg) return;

    if (messageId.startsWith('temp_')) {
      // Remove the optimistic failure placeholder and trigger fresh send
      setMessages((prev) => prev.filter((m) => m._id !== messageId && m.messageId !== messageId));
      try {
        await handleSendMessage(failedMsg.text);
      } catch {
        // Will be marked failed by handleSendMessage
      }
      return;
    }

    try {
      const res = await api.request<{ data: Message }>(`/messages/${messageId}/retry`, {
        method: 'POST'
      });
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? res.data : m))
      );
    } catch {
      // Keep as failed
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (jid: string) => {
    try {
      await api.request(`/conversations/${encodeURIComponent(jid)}`, {
        method: 'DELETE'
      });
      setConversations((prev) => prev.filter((c) => c.jid !== jid));
      setActiveConversation(null);
      setIsMobileChatOpen(false);
      setMessages([]);
    } catch {
      // Ignore
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('pulsechat_onboarding_done', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 dark:bg-[#0B0E14] text-slate-100 antialiased">
      {/* 1. Left Nav Sidebar */}
      <Sidebar
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenConnect={() => setShowConnectModal(true)}
        onOpenContacts={() => setShowContactsModal(true)}
      />

      {/* 2. Conversations Panel */}
      <div
        className={`w-full md:w-80 md:min-w-[20rem] md:max-w-[20rem] lg:w-96 lg:min-w-[24rem] lg:max-w-[24rem] flex-shrink-0 h-full overflow-hidden min-w-0 ${
          isMobileChatOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        <ConversationList
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          onOpenNewChat={() => setShowNewChatModal(true)}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          isLoading={isLoadingConversations}
        />
      </div>

      {/* 3. Main Chat View */}
      <div
        className={`flex-1 h-full min-w-0 overflow-hidden ${
          isMobileChatOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        <ChatArea
          conversation={activeConversation}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          onSendMessage={handleSendMessage}
          onSendMedia={handleSendMedia}
          onRetryMessage={handleRetryMessage}
          onDeleteConversation={handleDeleteConversation}
          onBackMobile={() => setIsMobileChatOpen(false)}
          isWhatsAppConnected={whatsAppSession.status === 'connected'}
          onOpenConnect={() => setShowConnectModal(true)}
        />
      </div>

      {/* Modals */}
      <ConnectWhatsAppModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onOpenConnect={() => setShowConnectModal(true)}
      />

      <NewConversationModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onConversationCreated={(newConv) => {
          handleSelectConversation(newConv);
          fetchConversations(searchTerm);
        }}
      />

      <ContactsModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        onSelectContactChat={(conv) => {
          handleSelectConversation(conv);
          fetchConversations(searchTerm);
        }}
      />

      {/* First-time onboarding overlay */}
      {showOnboarding && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
};
