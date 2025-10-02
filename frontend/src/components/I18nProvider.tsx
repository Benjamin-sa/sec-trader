'use client';

import { ReactNode, useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';

type Messages = Record<string, unknown>;

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState('en');
  const [messages, setMessages] = useState<Messages>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial locale from localStorage
    const stored = localStorage.getItem('preferred-locale');
    const initialLocale = stored || 'en';
    
    loadMessages(initialLocale);
    
    // Listen for locale changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferred-locale' && e.newValue) {
        loadMessages(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadMessages = async (newLocale: string) => {
    try {
      setIsLoading(true);
      const msgs = await import(`../../messages/${newLocale}.json`);
      setMessages(msgs.default);
      setLocale(newLocale);
    } catch (error) {
      console.error(`Failed to load messages for locale: ${newLocale}`, error);
      // Fallback to English
      const msgs = await import(`../../messages/en.json`);
      setMessages(msgs.default);
      setLocale('en');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
