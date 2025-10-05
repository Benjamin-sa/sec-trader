'use client';

import { createAuthClient } from "better-auth/react";

// Client-side auth helper
// Points to the dedicated auth worker instead of Next.js API routes
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8787", // Auth worker URL
});

// Export hooks for components
export const { 
  signIn, 
  signUp, 
  signOut, 
  useSession,
} = authClient;

// Export useUser hook - derives user from session
export function useUser() {
  const session = useSession();
  return {
    data: session.data?.user || null,
    isLoading: session.isPending,
    error: session.error,
  };
}

// Type exports
export type Session = Awaited<ReturnType<typeof authClient.getSession>>;
export type User = Session['user'];
