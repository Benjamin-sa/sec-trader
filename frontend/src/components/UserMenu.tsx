'use client';

import { useState } from 'react';
import { useUser, signOut } from '@/lib/auth-client';
import { AuthModal } from './AuthModal';
import { UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export function UserMenu() {
  const { data: user, isLoading } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  if (isLoading) {
    return (
      <div className="h-10 w-32 rounded-lg bg-gray-200 animate-pulse"></div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAuthModal('signin')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => openAuthModal('signup')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign Up
          </button>
        </div>
        {showAuthModal && (
          <AuthModal mode={authMode} onClose={() => setShowAuthModal(false)} />
        )}
      </>
    );
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors w-full"
      >
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.name || 'User'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user.email}
          </p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            
            <button
              onClick={() => {
                setShowDropdown(false);
                window.location.href = '/watchlist';
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserIcon className="h-5 w-5 text-gray-400" />
              <span>My Watchlist</span>
            </button>
            
            <button
              onClick={() => {
                setShowDropdown(false);
                window.location.href = '/alerts';
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
              <span>Alert Settings</span>
            </button>
            
            <hr className="my-1 border-gray-100" />
            
            <button
              onClick={() => {
                setShowDropdown(false);
                handleSignOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
