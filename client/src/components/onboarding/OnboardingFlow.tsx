import React, { useState } from 'react';
import {
  Sparkles,
  QrCode,
  CheckCircle2,
  Send,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { whatsAppSession, isConnectingWhatsApp, connectWhatsApp } = useSocket();
  const [step, setStep] = useState<number>(whatsAppSession.status === 'connected' ? 3 : 1);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const handleStartConnect = async () => {
    setIsStartingSession(true);
    try {
      await connectWhatsApp();
      setStep(2);
    } catch {
      // Handled in socket status
    } finally {
      setIsStartingSession(false);
    }
  };

  // If status becomes connected during QR step, automatically progress
  React.useEffect(() => {
    if (whatsAppSession.status === 'connected' && step < 3) {
      setStep(3);
    }
  }, [whatsAppSession.status, step]);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 dark:bg-[#121620] border border-slate-800 dark:border-[#22293A] rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Progress header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800 dark:border-[#1E2535]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">
              Guided Setup • Step {step} of 4
            </span>
          </div>
          <button
            onClick={onComplete}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip to Dashboard
          </button>
        </div>

        {/* Step 1: Welcome Screen */}
        {step === 1 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-brand-600/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto text-brand-400 shadow-glow">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Welcome, {user?.name}!</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                PulseChat gives you an isolated, encrypted WhatsApp Web workspace. Connect your
                device securely without passwords or third-party tracking.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left max-w-md mx-auto pt-2">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1" />
                <h4 className="text-xs font-semibold text-slate-200">AES-256 Encrypted</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Isolated credentials at rest</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80">
                <Smartphone className="w-5 h-5 text-brand-400 mb-1" />
                <h4 className="text-xs font-semibold text-slate-200">Official Linked Device</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Official Baileys QR protocol</p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full max-w-sm mx-auto"
              onClick={handleStartConnect}
              isLoading={isStartingSession || isConnectingWhatsApp}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Connect Your WhatsApp
            </Button>
          </div>
        )}

        {/* Step 2: QR Code Screen */}
        {step === 2 && (
          <div className="space-y-6 text-center">
            <div>
              <h3 className="text-xl font-bold text-slate-100">Scan QR with WhatsApp</h3>
              <p className="text-xs text-slate-400 mt-1">
                Point your phone camera to link your account
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
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
                    <span className="text-xs font-medium text-slate-500">Generating secure QR code...</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Badge status={whatsAppSession.status} />
                <button
                  onClick={connectWhatsApp}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Code
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-4 text-left text-xs space-y-2 text-slate-300">
              <p className="font-semibold text-slate-200 mb-1">How to connect:</p>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                <span>Open <strong>WhatsApp</strong> on your mobile phone</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                <span>Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                <span>Tap <strong>Link a Device</strong> and point your camera at the QR code above</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Connection Verification */}
        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-glow">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-100">WhatsApp Connected!</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                Your WhatsApp session is actively synchronized and ready for manual one-to-one messaging.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 text-left max-w-sm mx-auto space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Account:</span>
                <span className="font-semibold text-slate-200">{whatsAppSession.pushName || 'Connected Device'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Phone Number:</span>
                <span className="font-mono text-emerald-400 font-medium">{whatsAppSession.phoneNumber || 'Active'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Session Status:</span>
                <Badge status="connected" label="Live & Isolated" />
              </div>
            </div>

            <Button size="lg" className="w-full max-w-sm mx-auto" onClick={() => setStep(4)} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Continue to Messaging Tutorial
            </Button>
          </div>
        )}

        {/* Step 4: First-Message Walkthrough */}
        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-brand-600/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto text-brand-400 shadow-glow">
              <Send className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-100">You're All Set!</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                Start conversations anytime by clicking the <strong>New Conversation</strong> button.
                All messages sent and received sync instantly in real-time.
              </p>
            </div>

            <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 text-left space-y-2 max-w-md mx-auto">
              <p className="font-semibold text-slate-200">Tips for Best Experience:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>Type phone numbers with country code (e.g. <code>+14155552671</code>)</li>
                <li>Press <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-200">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-200">Shift+Enter</kbd> for a new line</li>
                <li>Responsible messaging: Avoid automated mass messaging to keep your WhatsApp account in good standing</li>
              </ul>
            </div>

            <Button size="lg" className="w-full max-w-sm mx-auto" onClick={onComplete}>
              Open Chat Workspace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
