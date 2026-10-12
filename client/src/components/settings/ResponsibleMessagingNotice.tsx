import React from 'react';
import { AlertTriangle, ShieldCheck, FileText } from 'lucide-react';

export const ResponsibleMessagingNotice: React.FC = () => {
  return (
    <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-200">Meta & WhatsApp Compliance Disclaimer</p>
          <p className="text-[11px] text-amber-300/90 leading-normal">
            PulseChat utilizes Baileys, an open-source WhatsApp multi-device client library. This software is
            <strong> not endorsed by or affiliated with Meta Platforms, Inc.</strong> Use of third-party
            clients must strictly comply with WhatsApp's Terms of Service.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          Responsible Usage Guidelines
        </h4>
        <ul className="list-disc pl-4 space-y-1 text-slate-400">
          <li><strong>Manual One-to-One Messaging Only:</strong> Automated marketing, spam, and unsolicited bulk messages are strictly prohibited.</li>
          <li><strong>Recipient Consent:</strong> Only initiate communication with contacts who have explicitly consented to receive your messages.</li>
          <li><strong>Account Health:</strong> Unsolicited messaging can lead to recipient complaints and temporary or permanent WhatsApp account restrictions.</li>
          <li><strong>Privacy & Safety:</strong> PulseChat never stores recipient contacts beyond your direct message history.</li>
        </ul>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400">
        <p>
          To report abuse or learn more about personal data protection, contact your system administrator or review your organization's messaging policies.
        </p>
      </div>
    </div>
  );
};
