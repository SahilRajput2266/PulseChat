import React from 'react';
import {
  MessageSquare,
  QrCode,
  Settings,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../ui/Badge';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenConnect: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, onOpenConnect }) => {
  const { user, logout } = useAuth();
  const { whatsAppSession } = useSocket();
  const { isDark, setTheme } = useTheme();

  return (
    <aside className="w-16 sm:w-18 h-full bg-slate-950 dark:bg-[#080B10] border-r border-slate-800 dark:border-[#1E2535] flex flex-col items-center py-4 justify-between z-20 flex-shrink-0">
      {/* Brand icon */}
      <div className="flex flex-col items-center gap-6">
        <div
          className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-glow cursor-pointer transition-transform hover:scale-105"
          title="PulseChat - Multi-Tenant WhatsApp Client"
        >
          <Sparkles className="w-5 h-5" />
        </div>

        {/* WhatsApp QR link icon button */}
        <button
          onClick={onOpenConnect}
          className={`relative p-2.5 rounded-xl transition-all ${
            whatsAppSession.status === 'connected'
              ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              : whatsAppSession.status === 'connecting'
              ? 'text-amber-400 bg-amber-500/10 animate-pulse'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={`WhatsApp: ${whatsAppSession.status.toUpperCase()}`}
        >
          <QrCode className="w-5 h-5" />
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
              whatsAppSession.status === 'connected'
                ? 'bg-emerald-400'
                : whatsAppSession.status === 'connecting'
                ? 'bg-amber-400'
                : 'bg-slate-500'
            }`}
          />
        </button>
      </div>

      {/* Bottom utilities */}
      <div className="flex flex-col items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Settings modal trigger */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          title="Settings & Profile"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User avatar / Logout */}
        <div className="pt-2 border-t border-slate-800/80 dark:border-[#1E2535] flex flex-col items-center gap-2">
          <div
            className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 cursor-pointer"
            onClick={onOpenSettings}
            title={`${user?.name} (${user?.email})`}
          >
            {user?.name?.slice(0, 2).toUpperCase() || 'U'}
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
