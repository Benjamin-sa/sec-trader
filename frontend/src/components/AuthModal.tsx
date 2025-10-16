'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function AuthModal({ mode: _mode, onClose }: { mode?: 'signin' | 'signup'; onClose?: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setIsVisible(true), 10);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleClose = () => {
    onClose?.();
  };

  // Don't render until mounted (client-side only)
  if (!mounted) return null;

  const modalContent = (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-900/60 to-blue-900/70 backdrop-blur-md" />
      
      {/* Modal container */}
      <div 
        className={`relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-8 text-center transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        {/* Disabled auth message */}
        <div className="mt-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            🔒
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Disabled</h2>
          <p className="text-gray-600 mb-6">
            The authentication system is currently being updated. Please check back later.
          </p>
          <button
            onClick={handleClose}
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/*
// ORIGINAL AUTH MODAL CODE COMMENTED OUT
// Restore when implementing new auth system
*/
