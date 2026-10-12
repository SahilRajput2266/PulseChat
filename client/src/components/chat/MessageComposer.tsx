import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface MessageComposerProps {
  onSendMessage: (text: string) => Promise<void>;
  isWhatsAppConnected: boolean;
  onOpenConnect: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isWhatsAppConnected,
  onOpenConnect
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || cooldownSeconds > 0) return;

    if (!isWhatsAppConnected) {
      setErrorMessage('WhatsApp is not connected. Connect your account first.');
      return;
    }

    setErrorMessage(null);
    setIsSending(true);

    try {
      await onSendMessage(trimmed);
      setText('');
      // Trigger local 2s anti-spam cooldown indicator
      setCooldownSeconds(2);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to dispatch message';
      setErrorMessage(msg);
      // If server returned rate limit cooldown waitSeconds
      if (msg.includes('wait')) {
        const match = msg.match(/(\d+)s/);
        if (match && match[1]) {
          setCooldownSeconds(parseInt(match[1], 10));
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-slate-900/95 dark:bg-[#11151E] border-t border-slate-800 dark:border-[#1E2535]">
      {/* Warning/Error Banner */}
      {errorMessage && (
        <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[10px] underline ml-2 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {!isWhatsAppConnected && (
        <div className="mb-2.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>WhatsApp session is currently disconnected. Link your device to chat.</span>
          </div>
          <Button size="sm" variant="secondary" onClick={onOpenConnect} className="text-xs py-1">
            Link WhatsApp
          </Button>
        </div>
      )}

      {/* Message input bar */}
      <div className="flex items-end gap-2 bg-slate-800/80 dark:bg-[#161C27] border border-slate-700/60 dark:border-[#22293A] rounded-xl p-2 transition-all focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/50">
        <textarea
          ref={textareaRef}
          rows={1}
          disabled={!isWhatsAppConnected || isSending}
          placeholder={
            isWhatsAppConnected
              ? 'Type a message... (Enter to send, Shift+Enter for new line)'
              : 'Connect WhatsApp to send messages...'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={4000}
          className="flex-1 max-h-36 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none px-2 py-1 leading-relaxed"
        />

        <div className="flex items-center gap-2 pb-0.5">
          {cooldownSeconds > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
              {cooldownSeconds}s
            </span>
          )}

          <Button
            size="sm"
            onClick={handleSend}
            disabled={!text.trim() || !isWhatsAppConnected || isSending || cooldownSeconds > 0}
            isLoading={isSending}
            className="rounded-lg h-9 w-9 p-0 flex items-center justify-center flex-shrink-0 shadow-glow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
