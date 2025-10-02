'use client';

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

const locales = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
] as const;

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState('en');

  useEffect(() => {
    // Get locale from localStorage or browser
    const stored = localStorage.getItem('preferred-locale');
    if (stored) {
      setCurrentLocale(stored);
    }
  }, []);

  const handleLocaleChange = (localeCode: string) => {
    setCurrentLocale(localeCode);
    localStorage.setItem('preferred-locale', localeCode);
    setIsOpen(false);
    // Reload page to apply new locale
    window.location.reload();
  };

  const currentLocaleData = locales.find(l => l.code === currentLocale) || locales[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLocaleData.name}</span>
        <span className="sm:hidden">{currentLocaleData.flag}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu">
              {locales.map((locale) => (
                <button
                  key={locale.code}
                  onClick={() => handleLocaleChange(locale.code)}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-100 ${
                    currentLocale === locale.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                  role="menuitem"
                >
                  <span className="text-lg">{locale.flag}</span>
                  <span>{locale.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
