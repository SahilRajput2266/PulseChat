import React from 'react';
import { X, Phone, Hash, ShieldCheck, Trash2, User } from 'lucide-react';
import { Conversation } from '../../types';
import { Button } from '../ui/Button';

interface ContactDrawerProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
  onDeleteConversation: (jid: string) => Promise<void>;
}

export const ContactDrawer: React.FC<ContactDrawerProps> = ({
  conversation,
  isOpen,
  onClose,
  onDeleteConversation
}) => {
  if (!isOpen) return null;

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the conversation with ${conversation.name}? All message records for this contact will be removed.`)) {
      await onDeleteConversation(conversation.jid);
      onClose();
    }
  };

  return (
    <div className="w-80 h-full bg-slate-900 dark:bg-[#11151E] border-l border-slate-800 dark:border-[#1E2535] flex flex-col z-20 shadow-xl animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 dark:border-[#1E2535] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Contact Details</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile info */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 border-2 border-brand-400/30 flex items-center justify-center text-white font-bold text-2xl shadow-glow-sm mb-3">
            {conversation.name.slice(0, 2).toUpperCase()}
          </div>
          <h4 className="text-base font-bold text-slate-100">{conversation.name}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{conversation.phoneNumber}</p>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-800 dark:border-[#1E2535]">
          <div className="flex items-center gap-3 text-xs">
            <Phone className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <div>
              <p className="text-slate-400">Phone</p>
              <p className="text-slate-200 font-mono mt-0.5">{conversation.phoneNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Hash className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-slate-400">WhatsApp JID</p>
              <p className="text-slate-200 font-mono text-[11px] truncate mt-0.5">{conversation.jid}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-slate-400">Encryption</p>
              <p className="text-slate-200 mt-0.5">End-to-End via Official WhatsApp Protocol</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 dark:border-[#1E2535]">
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            className="w-full"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Conversation
          </Button>
        </div>
      </div>
    </div>
  );
};
