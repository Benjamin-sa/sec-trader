'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser, sessionUtils, User, AuthError } from '@/lib/auth-client';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, error } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSession = async () => {
    setIsRefreshing(true);
    try {
      await sessionUtils.refreshSession();
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const signOut = async () => {
    await sessionUtils.signOutEverywhere();
  };

  // Auto-refresh session on focus if there's an error
  useEffect(() => {
    const handleFocus = () => {
      if (error && !isRefreshing) {
        refreshSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [error, isRefreshing]);

  const value: AuthContextValue = {
    user,
    isLoading: isLoading || isRefreshing,
    isAuthenticated: !!user,
    error,
    refreshSession,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo: string = '/login'
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        window.location.href = redirectTo;
      }
    }, [isAuthenticated, isLoading]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}