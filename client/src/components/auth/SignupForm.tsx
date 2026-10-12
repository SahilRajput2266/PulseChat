import React, { useState } from 'react';
import { User as UserIcon, Mail, Lock, UserPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface SignupFormProps {
  onToggleSignIn: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onToggleSignIn }) => {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await signup(name, email, password);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try a different email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-slate-900/90 dark:bg-[#121620] border border-slate-800 dark:border-[#22293A] rounded-2xl shadow-2xl backdrop-blur-md">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 bg-brand-600/10 border border-brand-500/30 rounded-xl flex items-center justify-center text-brand-500 mb-3 shadow-glow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Create an Account</h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Get started with isolated, encrypted WhatsApp messaging
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<UserIcon className="w-4 h-4" />}
          autoComplete="name"
          required
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="jane@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
          helperText="Must be at least 8 characters long"
          required
        />

        <Button
          type="submit"
          className="w-full mt-2"
          size="lg"
          isLoading={isLoading}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Create Account
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800 dark:border-[#1E2535] text-center">
        <p className="text-xs text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onToggleSignIn}
            className="text-brand-400 font-semibold hover:text-brand-300 ml-1 transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
