'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BellIcon,
  BookmarkIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as SearchIconSolid,
  BellIcon as BellIconSolid,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations();

  const navigation = [
    { 
      name: t('nav.home'), 
      href: '/', 
      icon: HomeIcon, 
      iconSolid: HomeIconSolid,
      description: t('nav.homeDescription')
    },
    { 
      name: t('nav.explore'), 
      href: '/explore', 
      icon: MagnifyingGlassIcon, 
      iconSolid: SearchIconSolid,
      description: t('nav.exploreDescription'),
      soon: true 
    },
    { 
      name: t('nav.watchlist'), 
      href: '/watchlist', 
      icon: BookmarkIcon, 
      iconSolid: BookmarkIconSolid,
      description: t('nav.watchlistDescription'),
      soon: true,
      requiresAuth: true 
    },
    { 
      name: t('nav.alerts'), 
      href: '/alerts', 
      icon: BellIcon, 
      iconSolid: BellIconSolid,
      description: t('nav.alertsDescription'),
      requiresAuth: true 
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Desktop & Mobile Top Navigation - Style Guide Compliant */}
      <nav className="bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-200/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-1.5 sm:p-2 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:scale-105">
                  <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="font-bold text-base sm:text-lg text-gray-900 hidden sm:block transition-colors group-hover:text-blue-600">
                  {t('header.title')}
                </span>
                <span className="font-bold text-sm text-gray-900 sm:hidden transition-colors group-hover:text-blue-600">
                  SEC Tracker
                </span>
              </Link>
            </div>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = isActive(item.href) ? item.iconSolid : item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.soon ? '#' : item.href}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 relative
                      ${isActive(item.href)
                        ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm'
                      }
                      ${item.soon ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                    `}
                    onClick={(e) => item.soon && e.preventDefault()}
                  >
                    <Icon className="h-5 w-5 transition-transform duration-200" />
                    {item.name}
                    {item.soon && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-xs px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                        Soon
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              
              {/* User Menu with Authentication */}
              <div className="hidden md:flex items-center gap-2">
                <UserMenu />
              </div>

              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Slide-out Menu - MOVED OUTSIDE NAV */}
      <div
        className={`
          md:hidden fixed inset-0 z-[60] transition-opacity duration-300
          ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Slide-out Panel */}
        <div
          className={`
            fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white/95 backdrop-blur-xl shadow-2xl
            transform transition-transform duration-300 ease-out
            ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200/60">
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-xl shadow-sm">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold text-lg text-gray-900">Menu</span>
                </div>
                <button
                  type="button"
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-2">
                  {navigation.map((item) => {
                    const Icon = isActive(item.href) ? item.iconSolid : item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.soon ? '#' : item.href}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-200 relative
                          ${isActive(item.href)
                            ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm'
                          }
                          ${item.soon ? 'opacity-50' : 'hover:scale-[1.02]'}
                        `}
                        onClick={(e) => {
                          if (item.soon) {
                            e.preventDefault();
                          } else {
                            setMobileMenuOpen(false);
                          }
                        }}
                      >
                        <Icon className="h-6 w-6 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.soon && (
                              <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                                Soon
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5 font-normal">{item.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </nav>

                {/* Divider */}
                <div className="my-6 border-t border-gray-200/60"></div>

                {/* User Section (Mobile) */}
                <div className="px-4 mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {t('nav.account')}
                  </p>
                  <UserMenu />
                </div>

                {/* Settings Section */}
                <div className="space-y-4">
                  <div className="px-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {t('nav.settings')}
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          {t('nav.language')}
                        </label>
                        <LanguageSwitcher />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200/60 bg-gradient-to-r from-gray-50 to-gray-50/50">
                <p className="text-xs text-center text-gray-500 font-medium">
                  {t('footer.copyright', { year: new Date().getFullYear() })}
                </p>
              </div>
            </div>
          </div>
        </div>

      {/* Mobile Bottom Navigation (Alternative/Additional) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/60 shadow-lg z-40 safe-area-bottom">
        <div className="grid grid-cols-4 h-16">
          {navigation.slice(0, 4).map((item) => {
            const Icon = isActive(item.href) ? item.iconSolid : item.icon;
            return (
              <Link
                key={item.name}
                href={item.soon ? '#' : item.href}
                className={`
                  flex flex-col items-center justify-center gap-1 transition-all duration-200
                  ${isActive(item.href)
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                  ${item.soon ? 'opacity-40' : 'hover:scale-105'}
                `}
                onClick={(e) => item.soon && e.preventDefault()}
              >
                <div className="relative">
                  <Icon className="h-6 w-6" />
                  {item.soon && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full shadow-sm"></span>
                  )}
                </div>
                <span className="text-xs font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
