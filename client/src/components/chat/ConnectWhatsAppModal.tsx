import React, { useEffect } from 'react';
import { RefreshCw, Smartphone, CheckCircle2, Shield, LogOut } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useSocket } from '../../context/SocketContext';

interface ConnectWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectWhatsAppModal: React.FC<ConnectWhatsAppModalProps> = ({ isOpen, onClose }) => {
  const {
    whatsAppSession,
    isConnectingWhatsApp,
    connectWhatsApp,
    disconnectWhatsApp
  } = useSocket();

  // If opening modal and disconnected, trigger connect
  useEffect(() => {
    if (isOpen && whatsAppSession.status === 'disconnected') {
      connectWhatsApp();
    }
  }, [isOpen, whatsAppSession.status, connectWhatsApp]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link WhatsApp Device"
      description="Scan the QR code with WhatsApp on your phone to link your personal session"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-slate-300">Connection State:</span>
          </div>
          <Badge status={whatsAppSession.status} />
        </div>

        {/* Connected state */}
        {whatsAppSession.status === 'connected' ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-glow">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-100">
                {whatsAppSession.pushName || 'Your WhatsApp Account'} is Linked
              </h4>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {whatsAppSession.phoneNumber || 'Active Device'}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (window.confirm('Disconnect this WhatsApp session?')) {
                    await disconnectWhatsApp();
                  }
                }}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Disconnect Session
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* Connecting / QR Code state */
          <div className="text-center space-y-4">
            <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-200 inline-block relative">
              {whatsAppSession.qrCode ? (
                <img
                  src={whatsAppSession.qrCode}
                  alt="WhatsApp Pairing QR Code"
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-600 gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
                  <span className="text-xs font-medium text-slate-500">
                    Generating live QR code...
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-center items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={connectWhatsApp}
                isLoading={isConnectingWhatsApp}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh QR Code
              </Button>
            </div>

            {/* Step by step */}
            <div className="p-3 bg-slate-800/40 border border-slate-800/80 rounded-xl text-left text-xs space-y-1.5 text-slate-300">
              <p className="font-semibold text-slate-200">How to link:</p>
              <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                <li>Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong> &gt; <strong>Linked Devices</strong></li>
                <li>Tap <strong>Link a Device</strong> and point your camera at the QR code above</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
