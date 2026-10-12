import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { Sparkles } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 dark:bg-[#0B0E14] text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4 animate-pulse">
          <Sparkles className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-wide">Loading PulseChat...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-slate-950 dark:bg-[#0B0E14] relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {isSignUp ? (
          <SignupForm onToggleSignIn={() => setIsSignUp(false)} />
        ) : (
          <LoginForm
            onToggleSignUp={() => setIsSignUp(true)}
            onForgotPassword={() => setShowForgotModal(true)}
          />
        )}

        <ForgotPasswordModal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
        />
      </div>
    );
  }

  return (
    <SocketProvider>
      <AppLayout />
    </SocketProvider>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
