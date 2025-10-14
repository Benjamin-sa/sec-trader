'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { signIn, signUp } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { AuthView } from './AuthView';
import { X } from 'lucide-react';

export function AuthModal({ mode = 'signin', onClose }: { mode?: 'signin' | 'signup'; onClose?: () => void }) {
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Trigger animation on mount
    setTimeout(() => setIsVisible(true), 10);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp.email({
          email,
          password,
          name,
        });
        // Success - user created
        handleClose();
        setTimeout(() => router.refresh(), 300);
      } else {
        await signIn.email({
          email,
          password,
        });
        // Success - signed in
        handleClose();
        setTimeout(() => router.refresh(), 300);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
  };

  // Don't render until mounted (client-side only)
  if (!mounted) return null;

  const modalContent = (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${
        isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop with blur effect */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-900/60 to-blue-900/70 backdrop-blur-md transition-all duration-300 ${
          isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Modal container */}
      <div 
        className={`relative w-full h-full lg:h-auto lg:max-w-6xl lg:rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-500 ${
          isVisible && !isClosing 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-95 opacity-0 translate-y-8'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-[110] w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 hover:scale-110 transition-all duration-200 hover:rotate-90 group shadow-lg"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        )}
        
        {/* Auth view component */}
        <AuthView
          mode={isSignUp ? 'signup' : 'signin'}
          email={email}
          password={password}
          name={name}
          error={error}
          loading={loading}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onNameChange={setName}
          onSubmit={handleSubmit}
          onToggleMode={handleToggleMode}
        />
      </div>
    </div>
  );

  // Render modal at document body level using portal
  return createPortal(modalContent, document.body);
}
