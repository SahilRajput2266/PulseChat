import React, { useState } from 'react';
import { Mail, KeyRound, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { api } from '../../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await api.request<{ message: string; debugResetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      if (data.debugResetToken) {
        setDebugToken(data.debugResetToken);
        setToken(data.debugResetToken);
      }
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to submit reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Check your token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetComplete = () => {
    setStep('request');
    setEmail('');
    setToken('');
    setNewPassword('');
    setDebugToken(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'success' ? 'Password Reset Complete' : 'Reset Password'}
      description={
        step === 'request'
          ? 'Enter your registered email to receive reset instructions'
          : step === 'reset'
          ? 'Enter your security reset token and new password'
          : undefined
      }
    >
      {error && (
        <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {step === 'request' && (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {debugToken && (
            <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs break-all">
              <strong>Dev Token:</strong> {debugToken}
            </div>
          )}
          <Input
            label="Reset Token"
            type="text"
            placeholder="Paste your 64-character token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            leftIcon={<KeyRound className="w-4 h-4" />}
            required
          />
          <Input
            label="New Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep('request')}>
              Back
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Update Password
            </Button>
          </div>
        </form>
      )}

      {step === 'success' && (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-300">
            Your password has been securely reset. You can now log in with your new credentials.
          </p>
          <Button onClick={handleResetComplete} className="w-full">
            Back to Sign In
          </Button>
        </div>
      )}
    </Modal>
  );
};
