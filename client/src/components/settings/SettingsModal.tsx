import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Smartphone,
  Moon,
  Sun,
  Laptop,
  AlertTriangle,
  FileText,
  Key,
  Trash2,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { ResponsibleMessagingNotice } from './ResponsibleMessagingNotice';
import { ThemeMode } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenConnect: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenConnect }) => {
  const { user, refreshUser, logout, deleteAccount } = useAuth();
  const { whatsAppSession, disconnectWhatsApp } = useSocket();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp' | 'security' | 'policy' | 'danger'>('profile');

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'security' && isOpen) {
      loadAuditLogs();
    }
  }, [activeTab, isOpen]);

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await api.request<{ logs: any[] }>('/user/audit-logs');
      setAuditLogs(data.logs);
    } catch {
      // Ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      await api.request('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, themePreference: theme })
      });
      await refreshUser();
      setProfileMessage('Profile updated successfully.');
    } catch (err: any) {
      setProfileMessage(`Error: ${err.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordMessage(null);
    try {
      await api.request('/user/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMessage('Password changed successfully. Other sessions revoked.');
    } catch (err: any) {
      setPasswordMessage(`Error: ${err.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Disconnect your WhatsApp session? You will need to scan the QR code again to reconnect.')) {
      await disconnectWhatsApp();
    }
  };

  const handleDeleteAccount = async () => {
    if (window.prompt('Type DELETE to permanently erase your account, messages, and encrypted WhatsApp keys:') === 'DELETE') {
      await deleteAccount();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings & Workspace Management"
      maxWidth="lg"
    >
      <div className="flex flex-col sm:flex-row gap-6 min-h-[380px]">
        {/* Navigation Sidebar */}
        <div className="w-full sm:w-44 flex sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r border-slate-800 dark:border-[#1E2535] pb-3 sm:pb-0 sm:pr-3">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
              activeTab === 'profile'
                ? 'bg-brand-600/10 text-brand-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Profile & Theme
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
              activeTab === 'whatsapp'
                ? 'bg-brand-600/10 text-brand-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            WhatsApp Session
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
              activeTab === 'security'
                ? 'bg-brand-600/10 text-brand-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Security & Logs
          </button>

          <button
            onClick={() => setActiveTab('policy')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
              activeTab === 'policy'
                ? 'bg-brand-600/10 text-brand-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Policy & Compliance
          </button>

          <button
            onClick={() => setActiveTab('danger')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
              activeTab === 'danger'
                ? 'bg-red-500/10 text-red-400 font-semibold'
                : 'text-red-400/80 hover:text-red-300'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Danger Zone
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto max-h-[460px] pr-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <Input
                  label="Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Email Address"
                  value={user?.email || ''}
                  disabled
                  helperText="Email address cannot be modified"
                />

                {/* Theme selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Appearance & Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        theme === 'dark'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        theme === 'light'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('system')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        theme === 'system'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                          : 'border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Laptop className="w-4 h-4" />
                      System
                    </button>
                  </div>
                </div>

                {profileMessage && (
                  <p className="text-xs text-brand-400">{profileMessage}</p>
                )}

                <Button type="submit" size="sm" isLoading={isSavingProfile}>
                  Save Profile
                </Button>
              </form>
            </div>
          )}

          {/* WhatsApp Session Tab */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Connection Status</span>
                  <Badge status={whatsAppSession.status} />
                </div>
                {whatsAppSession.phoneNumber && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Linked Phone</span>
                    <span className="font-mono text-slate-200">{whatsAppSession.phoneNumber}</span>
                  </div>
                )}
                {whatsAppSession.pushName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">WhatsApp Profile Name</span>
                    <span className="text-slate-200">{whatsAppSession.pushName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {whatsAppSession.status === 'connected' ? (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={handleDisconnect}
                  >
                    Disconnect WhatsApp Session
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      onClose();
                      onOpenConnect();
                    }}
                  >
                    Connect WhatsApp via QR Code
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Security & Audit Logs Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password update */}
              <form onSubmit={handleChangePassword} className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-brand-400" />
                  Change Password
                </h4>
                <Input
                  type="password"
                  placeholder="Current password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                {passwordMessage && (
                  <p className="text-xs text-brand-400">{passwordMessage}</p>
                )}
                <Button type="submit" size="sm" isLoading={isChangingPassword}>
                  Update Password
                </Button>
              </form>

              {/* Audit logs */}
              <div className="space-y-2 pt-4 border-t border-slate-800 dark:border-[#1E2535]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-200">Recent Security Activity</h4>
                  <button
                    onClick={loadAuditLogs}
                    className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  {isLoadingLogs ? (
                    <p className="text-slate-500 text-[11px]">Loading activity logs...</p>
                  ) : auditLogs.length === 0 ? (
                    <p className="text-slate-500 text-[11px]">No activity events found.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div
                        key={log._id}
                        className="p-2 rounded bg-slate-800/40 border border-slate-800/80 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono text-slate-200 text-[11px]">{log.action}</span>
                          <span className="text-slate-500 text-[10px] ml-2">{log.ipAddress || 'localhost'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compliance & Policy Tab */}
          {activeTab === 'policy' && (
            <ResponsibleMessagingNotice />
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Permanent Account & Session Deletion</span>
                </div>
                <p className="text-xs text-red-300/80 leading-relaxed">
                  Deleting your account permanently terminates your WhatsApp link, purges encrypted
                  storage keys, removes all synchronized conversations and message logs. This action
                  cannot be undone.
                </p>
                <div className="pt-2">
                  <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
                    Delete Account Permanently
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 dark:border-[#1E2535]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Log Out of PulseChat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
