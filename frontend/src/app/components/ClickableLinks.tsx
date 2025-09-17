'use client';

import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick(symbol ?? undefined, cik, name);
      return;
    }
    if (cik) {
      router.push(`/company/${cik}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-left hover:text-blue-600 hover:underline transition-colors ${className}`}
      title={`View all trades for ${name}${symbol ? ` (${symbol})` : ''}`}
      disabled={!cik}
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

export function ClickableInsider({ 
  name, 
  cik, 
  title, 
  className = "",
  onClick,
}: ClickableInsiderProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick(cik, name);
      return;
    }
    if (cik) {
      router.push(`/insider?cik=${encodeURIComponent(cik)}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-left hover:text-blue-600 hover:underline transition-colors ${className}`}
      title={`View all trades for ${name}${title ? ` (${title})` : ''}`}
      disabled={!cik}
    >
      <User className="h-4 w-4 text-gray-500 shrink-0" />
      <span className="font-medium text-gray-700">{name}</span>
      {title && (
        <span className="text-sm text-gray-600">• {title}</span>
      )}
    </button>
  );
}
