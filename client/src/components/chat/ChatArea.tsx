import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MoreVertical, ChevronDown, MessageSquare, Shield, ShieldCheck } from 'lucide-react';
import { Conversation, Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageComposer, MediaPayload } from './MessageComposer';
import { ContactDrawer } from './ContactDrawer';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  isLoadingMessages: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onSendMedia?: (payload: MediaPayload) => Promise<void>;
  onRetryMessage: (messageId: string) => void;
  onDeleteConversation: (jid: string) => Promise<void>;
  onBackMobile: () => void;
  isWhatsAppConnected: boolean;
  onOpenConnect: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  isLoadingMessages,
  onSendMessage,
  onSendMedia,
  onRetryMessage,
  onDeleteConversation,
  onBackMobile,
  isWhatsAppConnected,
  onOpenConnect
}) => {
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Group messages with date separators
  const renderMessageList = () => {
    let lastDateStr = '';

    // Guarantee no duplicate bubbles with identical messageId or _id
    const seenKeys = new Set<string>();
    const uniqueMessages = messages.filter((msg) => {
      const key = msg.messageId || msg._id;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    return uniqueMessages.map((msg) => {
      const msgDate = new Date(msg.timestamp);
      const now = new Date();
      let dateDivider = '';

      const isToday = msgDate.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = msgDate.toDateString() === yesterday.toDateString();

      if (isToday) {
        dateDivider = 'Today';
      } else if (isYesterday) {
        dateDivider = 'Yesterday';
      } else {
        dateDivider = msgDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      }

      const showDivider = dateDivider !== lastDateStr;
      if (showDivider) {
        lastDateStr = dateDivider;
      }

      return (
        <React.Fragment key={msg._id || msg.messageId}>
          {showDivider && (
            <div className="flex justify-center my-4 select-none">
              <span className="px-3 py-1 rounded-full bg-slate-800/80 dark:bg-[#161C27] border border-slate-700/60 dark:border-[#22293A] text-slate-400 text-[11px] font-medium shadow-sm">
                {dateDivider}
              </span>
            </div>
          )}
          <MessageBubble message={msg} onRetry={onRetryMessage} />
        </React.Fragment>
      );
    });
  };

  if (!conversation) {
    return (
      <div className="h-full flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/40 dark:bg-[#0B0E14] text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-600/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-4 shadow-glow">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-200">PulseChat for Web</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
          Send and receive WhatsApp messages from your computer. Select an existing conversation or click
          <strong className="text-slate-200"> New Chat</strong> to begin messaging.
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Multi-tenant encrypted Baileys session</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex h-full overflow-hidden bg-slate-950/30 dark:bg-[#0E121B]">
      {/* Main chat column */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Chat header */}
        <div className="h-16 px-4 py-3 bg-slate-900/90 dark:bg-[#11151E] border-b border-slate-800 dark:border-[#1E2535] flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile back button */}
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-full bg-slate-800 dark:bg-[#1E2535] border border-slate-700/60 dark:border-[#2E394E] flex items-center justify-center text-slate-200 font-semibold text-sm flex-shrink-0">
              {conversation.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">
                {conversation.name}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {conversation.phoneNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDetailsDrawer(!showDetailsDrawer)}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 dark:hover:bg-[#1E2535] rounded-lg transition-colors"
              title="Conversation details"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 relative"
        >
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <p className="text-sm font-medium text-slate-400">No messages in this chat yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Say hello to {conversation.name} using the composer below.
              </p>
            </div>
          ) : (
            renderMessageList()
          )}

          {/* Floating scroll to bottom button */}
          {showScrollBottom && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-24 right-8 p-2.5 rounded-full bg-brand-600 text-white shadow-glow hover:bg-brand-500 transition-all z-20"
              title="Scroll to bottom"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Fixed message composer */}
        <MessageComposer
          onSendMessage={onSendMessage}
          onSendMedia={onSendMedia}
          isWhatsAppConnected={isWhatsAppConnected}
          onOpenConnect={onOpenConnect}
        />
      </div>

      {/* Details Drawer */}
      <ContactDrawer
        conversation={conversation}
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        onDeleteConversation={onDeleteConversation}
      />
    </div>
  );
};
