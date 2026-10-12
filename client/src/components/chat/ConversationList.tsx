import React, { useState } from 'react';
import { Search, Plus, MessageSquarePlus, Filter } from 'lucide-react';
import { Conversation } from '../../types';
import { ConversationItem } from './ConversationItem';
import { Button } from '../ui/Button';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onOpenNewChat: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isLoading: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversation,
  onSelectConversation,
  onOpenNewChat,
  searchTerm,
  onSearchChange,
  isLoading
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'unread' && c.unreadCount === 0) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900/90 dark:bg-[#11151E] border-r border-slate-800 dark:border-[#1E2535]">
      {/* Top action bar */}
      <div className="p-4 border-b border-slate-800 dark:border-[#1E2535] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Messages
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
              {conversations.length}
            </span>
          </h2>
          <Button
            size="sm"
            onClick={onOpenNewChat}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="rounded-full shadow-glow-sm"
          >
            New Chat
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 dark:bg-[#161C27] border border-slate-800 dark:border-[#22293A] rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Chats
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Conversations Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-transparent">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-slate-800 dark:bg-[#1E2535]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-800 dark:bg-[#1E2535] rounded w-2/3" />
                  <div className="h-2.5 bg-slate-800/60 dark:bg-[#161C27] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-center mb-3">
              <MessageSquarePlus className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-300">No conversations yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              {searchTerm ? 'No results matched your search term.' : 'Start a manual one-to-one conversation to begin messaging.'}
            </p>
            {!searchTerm && (
              <Button size="sm" variant="outline" className="mt-4" onClick={onOpenNewChat}>
                Start a Conversation
              </Button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              isActive={activeConversation?._id === conv._id}
              onClick={() => onSelectConversation(conv)}
            />
          ))
        )}
      </div>
    </div>
  );
};
