import React, { useState } from 'react';
import { Check, CheckCheck, Clock, AlertCircle, Copy, Check as CopiedCheck, RefreshCw } from 'lucide-react';
import { Message, MessageStatus } from '../../types';

interface MessageBubbleProps {
  message: Message;
  onRetry?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetry }) => {
  const isOutbound = message.direction === 'outbound';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStatus = (status: MessageStatus) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3.5 h-3.5 text-blue-200 animate-pulse" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-blue-200" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-200" />;
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />;
      case 'failed':
        return (
          <button
            onClick={() => onRetry && onRetry(message._id)}
            title="Message failed to send. Click to retry."
            className="flex items-center gap-1 text-red-300 hover:text-red-100 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <RefreshCw className="w-3 h-3" />
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`group relative flex flex-col mb-2.5 max-w-[82%] sm:max-w-[70%] select-text ${
        isOutbound ? 'ml-auto items-end' : 'mr-auto items-start'
      }`}
    >
      <div
        className={`relative px-4 py-2.5 rounded-2xl shadow-sm text-sm transition-all ${
          isOutbound
            ? 'bg-brand-600 text-white rounded-br-none shadow-glow-sm'
            : 'bg-slate-800/90 dark:bg-[#161C27] text-slate-100 rounded-bl-none border border-slate-700/60 dark:border-[#22293A]'
        }`}
      >
        {/* Copy button hover trigger */}
        <button
          onClick={handleCopy}
          className={`absolute top-2 -translate-y-1 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/40 text-slate-200 hover:text-white transition-opacity ${
            isOutbound ? '-left-8' : '-right-8'
          }`}
          title="Copy message text"
        >
          {copied ? <CopiedCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Message body */}
        <div className="whitespace-pre-wrap break-words leading-relaxed">
          {message.text}
        </div>

        {/* Timestamp & Status footer */}
        <div
          className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] select-none ${
            isOutbound ? 'text-blue-100/80' : 'text-slate-400'
          }`}
        >
          <span>{formatTime(message.timestamp)}</span>
          {isOutbound && renderStatus(message.status)}
        </div>
      </div>
    </div>
  );
};
