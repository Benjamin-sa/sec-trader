'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * AUTH SYSTEM DISABLED
 * 
 * This auth client has been disabled. All functions return mock data
 * to keep the UI working while the backend auth system is removed.
 * Replace with new auth implementation when ready.
 */

// Mock types for compatibility
export interface User {
  id: string;
  name?: string;
  email: string;
  image?: string;
  emailVerified?: string;
}

export interface Session {
  user: User;
  expires: string;
}

export interface AuthError {
  message: string;
  code?: string;
  timestamp?: string;
}

// Mock auth client - does nothing but maintains interface
class DisabledAuthClient {
  constructor() {
    console.warn('🚫 Auth system is disabled');
  }

  async signIn(_credentials: { email: string; password: string }) {
    throw new Error('Authentication is currently disabled');
  }

  async signUp(_credentials: { email: string; password: string; name: string }) {
    throw new Error('Authentication is currently disabled');
  }

  async signOut() {
    console.warn('🚫 Sign out called but auth is disabled');
    return null;
  }

  async getSession(): Promise<Session | null> {
    return null; // Always return no session
  }
}

const _authClient = new DisabledAuthClient();

// Disabled sign in functions
export const signIn = {
  email: async (_credentials: { email: string; password: string }) => {
    throw new Error('Authentication is currently disabled. Please check back later.');
  },
};

export const signUp = {
  email: async (_credentials: { email: string; password: string; name: string }) => {
    throw new Error('Authentication is currently disabled. Please check back later.');
  },
};

export const signOut = async () => {
  console.warn('🚫 Auth system is disabled');
  return null;
};

// Mock session hook - always returns no session
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Set to false since there's nothing to load
  const [_error, _setError] = useState<Error | null>(null);

  const refreshSession = useCallback(async () => {
    // Do nothing - auth is disabled
    setSession(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return {
    data: session,
    isLoading,
    error: _error,
    refresh: refreshSession,
    // Add isPending for compatibility
    isPending: isLoading,
  };
}

// Mock user hook
export function useUser() {
  const { data: _session, isLoading, error, refresh } = useSession();
  
  return {
    data: null, // Always no user
    isLoading,
    error,
    retry: refresh,
    canRetry: false,
  };
}

// Mock authentication check
export function useIsAuthenticated() {
  return false; // Always not authenticated
}

// Mock session utilities
export const sessionUtils = {
  clearLocalSession: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-session');
    }
  },
  
  refreshSession: async () => {
    return null;
  },
  
  signOutEverywhere: async () => {
    console.warn('🚫 Auth system is disabled');
  },
};
