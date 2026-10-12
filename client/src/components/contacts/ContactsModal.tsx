import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  X,
  Phone,
  MessageSquare,
  Trash2,
  Edit2,
  Tag,
  FileText,
  AlertCircle,
  Check
} from 'lucide-react';
import { Contact, Conversation } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContactChat: (conv: Conversation) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  onSelectContactChat
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add/Edit Form State
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchContacts = async (search = '') => {
    setIsLoading(true);
    try {
      const res = await api.request<{ contacts: Contact[] }>(
        `/contacts${search ? `?search=${encodeURIComponent(search)}` : ''}`
      );
      setContacts(res.contacts || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load contacts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContacts(searchTerm);
    }
  }, [isOpen, searchTerm]);

  const handleStartChat = async (contact: Contact) => {
    try {
      // Find or start conversation with this contact
      const res = await api.request<{ conversation: Conversation }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          phone: contact.phoneNumber,
          name: contact.name
        })
      });
      onSelectContactChat(res.conversation);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to open chat with contact.');
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || (!editingContactId && !phone.trim())) {
      setErrorMessage('Name and phone number are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingContactId) {
        // Update contact
        await api.request(`/contacts/${editingContactId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            notes: notes.trim(),
            tags: parsedTags
          })
        });
      } else {
        // Create new contact
        const res = await api.request<{ contact: Contact; conversation: Conversation }>('/contacts', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            notes: notes.trim(),
            tags: parsedTags
          })
        });

        // Optionally start chat right away
        if (res.conversation) {
          onSelectContactChat(res.conversation);
        }
      }

      resetForm();
      fetchContacts(searchTerm);
      if (!editingContactId) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (contact: Contact) => {
    setEditingContactId(contact._id);
    setName(contact.name);
    setPhone(contact.phoneNumber);
    setNotes(contact.notes || '');
    setTagsInput(contact.tags?.join(', ') || '');
    setShowAddForm(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact? Messages from this number will no longer be stored.')) {
      return;
    }

    try {
      await api.request(`/contacts/${contactId}`, { method: 'DELETE' });
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete contact.');
    }
  };

  const resetForm = () => {
    setEditingContactId(null);
    setName('');
    setPhone('');
    setNotes('');
    setTagsInput('');
    setShowAddForm(false);
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl bg-slate-900 dark:bg-[#121620] border border-slate-800 dark:border-[#1E2535] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 dark:border-[#1E2535]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Contacts Book</h3>
              <p className="text-xs text-slate-400">
                Only saved contacts will have messages stored in PulseChat
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Search Bar */}
        <div className="p-4 border-b border-slate-800 dark:border-[#1E2535] flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts by name, number, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/80 dark:bg-[#161C27] border border-slate-700/60 dark:border-[#22293A] text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
            />
          </div>

          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-1.5 text-xs py-2 shadow-glow-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Contact</span>
          </Button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-[10px] underline hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Form: Add or Edit Contact */}
        {showAddForm && (
          <form
            onSubmit={handleSaveContact}
            className="p-4 bg-slate-800/40 dark:bg-[#161C27]/60 border-b border-slate-800 dark:border-[#1E2535] space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                {editingContactId ? 'Edit Contact' : 'Create New Contact'}
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harman, Kush"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 dark:bg-[#121620] border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Phone Number (with Country Code) *
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingContactId)}
                  placeholder="e.g. +918283502962"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 dark:bg-[#121620] border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Client, VIP, Team"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-slate-900 dark:bg-[#121620] border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Lead from campaign"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 dark:bg-[#121620] border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" type="submit" isLoading={isSubmitting} className="text-xs py-1.5 px-4 shadow-glow-sm">
                <Check className="w-3.5 h-3.5 mr-1" />
                {editingContactId ? 'Update Contact' : 'Save & Link'}
              </Button>
            </div>
          </form>
        )}

        {/* Contacts List Body */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-800/60 dark:divide-[#1E2535]/60 space-y-1">
          {isLoading && contacts.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              Loading contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No contacts found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add contacts using the button above. Only contacts in this list will have their messages stored.
              </p>
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact._id}
                className="py-3 px-2 rounded-xl hover:bg-slate-800/40 dark:hover:bg-[#161C27] flex items-center justify-between gap-3 transition-colors group"
              >
                {/* Contact Avatar & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700/60 flex items-center justify-center text-slate-200 font-semibold text-xs flex-shrink-0">
                    {contact.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-brand-300 transition-colors">
                        {contact.name}
                      </h4>
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-medium"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="font-mono">{contact.phoneNumber}</span>
                      {contact.notes && (
                        <span className="text-[11px] text-slate-500 truncate ml-1">• {contact.notes}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleStartChat(contact)}
                    className="h-8 px-2.5 text-xs shadow-glow-sm flex items-center gap-1"
                    title="Open Chat"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Chat</span>
                  </Button>

                  <button
                    onClick={() => handleStartEdit(contact)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                    title="Edit Contact"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteContact(contact._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete Contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
