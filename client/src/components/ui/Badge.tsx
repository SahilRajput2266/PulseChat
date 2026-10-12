import React from 'react';
import { WhatsAppSessionStatus } from '../../types';

export interface BadgeProps {
  status: WhatsAppSessionStatus | 'inbound' | 'outbound' | 'custom';
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, className = '' }) => {
  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';
  let defaultLabel = 'Disconnected';

  switch (status) {
    case 'connected':
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      dotColor = 'bg-emerald-400 animate-pulse';
      defaultLabel = 'Connected';
      break;
    case 'connecting':
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      dotColor = 'bg-amber-400 animate-ping';
      defaultLabel = 'Connecting';
      break;
    case 'error':
      colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      dotColor = 'bg-rose-400';
      defaultLabel = 'Error';
      break;
    case 'disconnected':
    default:
      colorClasses = 'bg-slate-500/10 text-slate-400 border-slate-700/50';
      dotColor = 'bg-slate-500';
      defaultLabel = 'Disconnected';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label || defaultLabel}</span>
    </span>
  );
};
