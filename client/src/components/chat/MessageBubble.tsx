import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Copy,
  Check as CopiedCheck,
  RefreshCw,
  FileText,
  Download,
  X,
  Maximize2
} from 'lucide-react';
import { Message, MessageStatus } from '../../types';

interface MessageBubbleProps {
  message: Message;
  onRetry?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetry }) => {
  const isOutbound = message.direction === 'outbound';
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleCopy = () => {
    const textToCopy = message.caption || message.text;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  // Determine media presence
  const isImage =
    message.mediaType === 'image' ||
    Boolean(message.mediaUrl && /\.(jpe?g|png|webp|gif)$/i.test(message.mediaUrl));

  const isDocument = message.mediaType === 'document';
  const isVideo = message.mediaType === 'video';
  const isAudio = message.mediaType === 'audio';

  const captionText =
    message.caption ||
    (message.text && !message.text.startsWith('📷') && !message.text.startsWith('📄') && message.text !== '[Image]'
      ? message.text
      : '');

  return (
    <>
      <div
        className={`group relative flex flex-col mb-2.5 max-w-[85%] sm:max-w-[70%] select-text ${
          isOutbound ? 'ml-auto items-end' : 'mr-auto items-start'
        }`}
      >
        <div
          className={`relative rounded-2xl shadow-sm text-sm transition-all overflow-hidden ${
            isOutbound
              ? 'bg-brand-600 text-white rounded-br-none shadow-glow-sm'
              : 'bg-slate-800/90 dark:bg-[#161C27] text-slate-100 rounded-bl-none border border-slate-700/60 dark:border-[#22293A]'
          } ${isImage ? 'p-1.5' : 'px-4 py-2.5'}`}
        >
          {/* Copy button hover trigger */}
          {captionText && (
            <button
              onClick={handleCopy}
              className={`absolute top-2 -translate-y-1 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/40 text-slate-200 hover:text-white transition-opacity z-10 ${
                isOutbound ? '-left-8' : '-right-8'
              }`}
              title="Copy message text"
            >
              {copied ? <CopiedCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Media Content: Image */}
          {isImage && message.mediaUrl && (
            <div className="relative group/img overflow-hidden rounded-xl bg-black/20 cursor-pointer">
              <img
                src={message.mediaUrl}
                alt={captionText || 'WhatsApp Image'}
                loading="lazy"
                onClick={() => setIsLightboxOpen(true)}
                className="max-h-[340px] w-auto max-w-full rounded-xl object-contain hover:scale-[1.01] transition-transform duration-200"
              />
              <button
                onClick={() => setIsLightboxOpen(true)}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
                title="View full image"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Media Content: Document */}
          {isDocument && message.mediaUrl && (
            <div className="flex items-center gap-3 p-2.5 my-1 rounded-xl bg-black/15 dark:bg-black/30 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-xs font-medium truncate text-slate-100">{message.fileName || 'Attachment Document'}</p>
                <p className="text-[10px] text-slate-300/70">{formatFileSize(message.fileSize)}</p>
              </div>
              <a
                href={message.mediaUrl}
                download={message.fileName || 'document'}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Media Content: Video */}
          {isVideo && message.mediaUrl && (
            <div className="overflow-hidden rounded-xl bg-black/30 my-1">
              <video src={message.mediaUrl} controls className="max-h-[300px] w-full rounded-xl" />
            </div>
          )}

          {/* Media Content: Audio */}
          {isAudio && message.mediaUrl && (
            <div className="my-1">
              <audio src={message.mediaUrl} controls className="max-w-[260px] h-9" />
            </div>
          )}

          {/* Text / Caption Body */}
          {captionText && (
            <div className={`whitespace-pre-wrap break-words leading-relaxed ${isImage ? 'px-2.5 pt-2' : ''}`}>
              {captionText}
            </div>
          )}

          {/* Timestamp & Status footer */}
          <div
            className={`flex items-center justify-end gap-1.5 select-none ${
              isImage ? 'px-2 pb-1 pt-1' : 'mt-1'
            } text-[10px] ${isOutbound ? 'text-blue-100/80' : 'text-slate-400'}`}
          >
            <span>{formatTime(message.timestamp)}</span>
            {isOutbound && renderStatus(message.status)}
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Fullscreen Image View */}
      {isLightboxOpen && message.mediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={message.mediaUrl}
              download={message.fileName || 'whatsapp_image.jpg'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors shadow-lg"
              title="Download image"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2.5 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors shadow-lg"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={message.mediaUrl}
              alt="Fullscreen preview"
              className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            {captionText && (
              <p className="mt-3 text-sm text-slate-200 text-center bg-black/60 px-4 py-2 rounded-lg max-w-xl">
                {captionText}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
