import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertTriangle, ShieldAlert, Paperclip, Image as ImageIcon, X, FileText } from 'lucide-react';
import { Button } from '../ui/Button';

export interface MediaPayload {
  file: File;
  base64: string;
  caption?: string;
  mediaType: 'image' | 'document' | 'video' | 'audio';
  fileName: string;
  mimetype: string;
}

interface MessageComposerProps {
  onSendMessage: (text: string) => Promise<void>;
  onSendMedia?: (payload: MediaPayload) => Promise<void>;
  isWhatsAppConnected: boolean;
  onOpenConnect: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onSendMedia,
  isWhatsAppConnected,
  onOpenConnect
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 16MB
    if (file.size > 16 * 1024 * 1024) {
      setErrorMessage('File exceeds the 16MB limit.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setErrorMessage(null);
    textareaRef.current?.focus();
    // Reset file input value so same file can be re-selected
    e.target.value = '';
  };

  const clearSelectedFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSend = async () => {
    if (isSending || cooldownSeconds > 0) return;

    if (!isWhatsAppConnected) {
      setErrorMessage('WhatsApp is not connected. Connect your account first.');
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;

    setErrorMessage(null);
    setIsSending(true);

    try {
      if (selectedFile && onSendMedia) {
        // Convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(selectedFile);
        const base64 = await base64Promise;

        let mediaType: 'image' | 'document' | 'video' | 'audio' = 'document';
        if (selectedFile.type.startsWith('image/')) mediaType = 'image';
        else if (selectedFile.type.startsWith('video/')) mediaType = 'video';
        else if (selectedFile.type.startsWith('audio/')) mediaType = 'audio';

        await onSendMedia({
          file: selectedFile,
          base64,
          caption: trimmed || undefined,
          mediaType,
          fileName: selectedFile.name,
          mimetype: selectedFile.type
        });

        clearSelectedFile();
        setText('');
      } else {
        await onSendMessage(trimmed);
        setText('');
      }

      setCooldownSeconds(2);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to dispatch message';
      setErrorMessage(msg);
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

      {/* Selected Media Preview Bar */}
      {selectedFile && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-slate-800/90 dark:bg-[#161C27] border border-slate-700/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Upload preview"
                className="w-11 h-11 rounded-lg object-cover border border-slate-600 flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-100 truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-slate-400">
                {(selectedFile.size / 1024).toFixed(0)} KB • Ready to send
              </p>
            </div>
          </div>
          <button
            onClick={clearSelectedFile}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message input bar */}
      <div className="flex items-end gap-2 bg-slate-800/80 dark:bg-[#161C27] border border-slate-700/60 dark:border-[#22293A] rounded-xl p-2 transition-all focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/50">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,video/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment trigger button */}
        <button
          type="button"
          disabled={!isWhatsAppConnected || isSending}
          onClick={() => fileInputRef.current?.click()}
          title="Attach image or file"
          className="p-1.5 mb-0.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          disabled={!isWhatsAppConnected || isSending}
          placeholder={
            !isWhatsAppConnected
              ? 'Connect WhatsApp to send messages...'
              : selectedFile
              ? 'Add a caption... (optional, press Enter to send)'
              : 'Type a message... (Enter to send, Shift+Enter for new line)'
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
            disabled={(!text.trim() && !selectedFile) || !isWhatsAppConnected || isSending || cooldownSeconds > 0}
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
