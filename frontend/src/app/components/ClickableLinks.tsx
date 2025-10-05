'use client';

import Link from 'next/link';
import { Building2, User } from 'lucide-react';

interface ClickableCompanyProps {
  name: string;
  symbol?: string | null;
  cik?: string;
  className?: string;
  onClick?: (symbol?: string, cik?: string, name?: string) => void;
}

interface ClickableInsiderProps {
  name: string;
  cik?: string;
  title?: string | null;
  className?: string;
  onClick?: (cik?: string, name?: string) => void;
}

export function ClickableCompany({ 
  name, 
  symbol, 
  cik, 
  className = "",
  onClick,
}: ClickableCompanyProps) {
  // If onClick is provided, use button for modal behavior
  if (onClick) {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(symbol ?? undefined, cik, name);
    };

    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1 text-left hover:text-blue-600 hover:underline transition-colors ${className}`}
        title={`View all trades for ${name}${symbol ? ` (${symbol})` : ''}`}
        type="button"
      >
        <Building2 className="h-4 w-4 text-gray-500 shrink-0" />
        <span className="font-medium text-gray-900 truncate">{name}</span>
        {symbol && (
          <span className="text-sm font-normal text-gray-600 shrink-0">
            ({symbol})
          </span>
        )}
      </button>
    );
  }

  // Otherwise, use proper Link for navigation
  if (!cik) {
    return (
      <span className={`inline-flex items-center gap-1 text-gray-400 ${className}`}>
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="font-medium truncate">{name}</span>
        {symbol && (
          <span className="text-sm font-normal shrink-0">
            ({symbol})
          </span>
        )}
      </span>
    );
  }

  return (
    <Link
      href={`/company/${cik}`}
      className={`inline-flex items-center gap-1 text-gray-900 hover:text-blue-600 hover:underline transition-colors ${className}`}
      title={`View all trades for ${name}${symbol ? ` (${symbol})` : ''}`}
    >
      <Building2 className="h-4 w-4 text-gray-500 shrink-0" />
      <span className="font-medium truncate">{name}</span>
      {symbol && (
        <span className="text-sm font-normal text-gray-600 shrink-0">
          ({symbol})
        </span>
      )}
    </Link>
  );
}

export function ClickableInsider({ 
  name, 
  cik, 
  title, 
  className = "",
  onClick,
}: ClickableInsiderProps) {
  // If onClick is provided, use button for modal behavior
  if (onClick) {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(cik, name);
    };

    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1 text-left hover:text-blue-600 hover:underline transition-colors ${className}`}
        title={`View all trades for ${name}${title ? ` (${title})` : ''}`}
        type="button"
      >
        <User className="h-4 w-4 text-gray-500 shrink-0" />
        <span className="font-medium text-gray-700 truncate">{name}</span>
        {title && (
          <span className="text-sm text-gray-600 shrink-0">• {title}</span>
        )}
      </button>
    );
  }

  // Otherwise, use proper Link for navigation
  if (!cik) {
    return (
      <span className={`inline-flex items-center gap-1 text-gray-400 ${className}`}>
        <User className="h-4 w-4 shrink-0" />
        <span className="font-medium truncate">{name}</span>
        {title && (
          <span className="text-sm text-gray-600 shrink-0">• {title}</span>
        )}
      </span>
    );
  }

  return (
    <Link
      href={`/insider?cik=${encodeURIComponent(cik)}`}
      className={`inline-flex items-center gap-1 text-gray-700 hover:text-blue-600 hover:underline transition-colors ${className}`}
      title={`View all trades for ${name}${title ? ` (${title})` : ''}`}
    >
      <User className="h-4 w-4 text-gray-500 shrink-0" />
      <span className="font-medium truncate">{name}</span>
      {title && (
        <span className="text-sm text-gray-600 shrink-0">• {title}</span>
      )}
    </Link>
  );
}
