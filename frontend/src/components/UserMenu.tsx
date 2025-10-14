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
      <div className="h-10 w-32 rounded-xl bg-gradient-to-r from-gray-200 to-gray-100 animate-pulse shadow-sm"></div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAuthModal('signin')}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 hover:scale-105 transition-all duration-200 shadow-sm"
          >
            Sign In
          </button>
          <button
            onClick={() => openAuthModal('signup')}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:shadow-md hover:scale-105 hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
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
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:scale-[1.02] transition-all duration-200 w-full shadow-sm hover:shadow-md"
      >
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {user.name || 'User'}
          </p>
          <p className="text-xs font-medium text-gray-500 truncate">
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
          
          <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/60 py-1 z-50 animate-fade-in">
            <div className="px-4 py-3 border-b border-gray-200/60 bg-gradient-to-r from-gray-50/50 to-transparent rounded-t-xl">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name || 'User'}</p>
              <p className="text-xs font-medium text-gray-500 truncate">{user.email}</p>
            </div>
            
            <button
              onClick={() => {
                setShowDropdown(false);
                window.location.href = '/watchlist';
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-50/50 hover:text-blue-700 transition-all duration-200 group"
            >
              <UserIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span>My Watchlist</span>
            </button>
            
            <button
              onClick={() => {
                setShowDropdown(false);
                window.location.href = '/alerts';
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-50/50 hover:text-blue-700 transition-all duration-200 group"
            >
              <Cog6ToothIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <span>Alert Settings</span>
            </button>
            
            <hr className="my-1 border-gray-200/60" />
            
            <button
              onClick={() => {
                setShowDropdown(false);
                handleSignOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-50/50 transition-all duration-200 rounded-b-xl group"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
