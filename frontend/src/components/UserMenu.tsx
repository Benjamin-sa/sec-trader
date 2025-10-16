'use client';

import { useState } from 'react';
import { AuthModal } from './AuthModal';

export function UserMenu() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  // Always show not authenticated state since auth is disabled
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => openAuthModal('signin')}
          className="px-4 py-2 text-sm font-semibold text-gray-400 border-2 border-gray-200 rounded-xl cursor-not-allowed opacity-50"
          disabled
        >
          Sign In (Disabled)
        </button>
        <button
          onClick={() => openAuthModal('signup')}
          className="px-4 py-2 text-sm font-semibold text-white bg-gray-400 rounded-xl cursor-not-allowed opacity-50"
          disabled
        >
          Sign Up (Disabled)
        </button>
      </div>
      {showAuthModal && (
        <AuthModal mode={authMode} onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
}

/*
// ORIGINAL USER MENU CODE COMMENTED OUT
// Restore when implementing new auth system
*/
