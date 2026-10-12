import React, { useState } from 'react';
import { Phone, MessageSquare, Send, AlertCircle, Globe } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Conversation } from '../../types';
import { api } from '../../services/api';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onConversationCreated
}) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim()) {
      setError('Please provide a recipient phone number.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.request<{ conversation: Conversation }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim() || undefined,
          initialMessage: initialMessage.trim() || undefined
        })
      });

      onConversationCreated(data.conversation);
      setPhone('');
      setName('');
      setInitialMessage('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start conversation. Ensure your WhatsApp is connected.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start New Conversation"
      description="Enter an international phone number to message directly"
      maxWidth="md"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Phone Number (E.164 International Format)"
            type="tel"
            placeholder="+1 415 555 2671"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Globe className="w-4 h-4" />}
            helperText="Include country calling code (e.g., +1 for US, +44 for UK, +91 for India)"
            required
            autoFocus
          />
        </div>

        <div>
          <Input
            label="Contact Name (Optional)"
            type="text"
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">
            Initial Message (Optional)
          </label>
          <div className="relative">
            <textarea
              rows={3}
              placeholder="Hi there! Writing to you from PulseChat..."
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              className="w-full bg-slate-900/60 dark:bg-[#121620] border border-slate-800 dark:border-[#22293A] text-slate-100 placeholder-slate-500 rounded-lg text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 dark:border-[#1E2535]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={initialMessage.trim() ? <Send className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
          >
            {initialMessage.trim() ? 'Send & Start Chat' : 'Create Conversation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
