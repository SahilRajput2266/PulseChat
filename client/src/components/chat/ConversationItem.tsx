import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { Conversation, MessageStatus } from '../../types';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick
}) => {
  // Format timestamp (e.g. 10:45 AM, Yesterday, or 10/12/26)
  const formatTimestamp = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (isYesterday) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
  };

  // Get contact initials for avatar
  const getInitials = (name: string) => {
    if (!name) return '#';
    const clean = name.replace('+', '');
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  // Status icon for outbound messages
  const renderStatusIcon = (status?: MessageStatus) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-slate-400" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-brand-400" />;
      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3.5 px-4 py-3 cursor-pointer transition-all border-b border-slate-800/40 dark:border-[#1E2535]/60 select-none min-w-0 w-full overflow-hidden ${
        isActive
          ? 'bg-slate-800/80 dark:bg-[#1E2535] border-l-4 border-l-brand-500'
          : 'hover:bg-slate-800/40 dark:hover:bg-[#161C27]'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 dark:from-[#1E2535] dark:to-[#2A344B] border border-slate-700/60 dark:border-[#2E394E] flex items-center justify-center text-slate-200 font-semibold text-sm shadow-sm">
          {getInitials(conversation.name)}
        </div>
      </div>

      {/* Info column */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-1 gap-2 min-w-0">
          <h4 className="text-sm font-medium text-slate-100 truncate min-w-0 flex-1 group-hover:text-brand-300 transition-colors">
            {conversation.name}
          </h4>
          <span className="text-[11px] text-slate-400 font-normal flex-shrink-0 whitespace-nowrap">
            {formatTimestamp(conversation.lastMessageTimestamp)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0 flex-1 overflow-hidden">
            {conversation.lastMessageDirection === 'outbound' && (
              <span className="flex-shrink-0">
                {renderStatusIcon(conversation.lastMessageStatus)}
              </span>
            )}
            <span className="truncate block flex-1 text-slate-400">
              {conversation.lastMessagePreview || 'No messages yet'}
            </span>
          </div>

          {conversation.unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center shadow-glow-sm">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
