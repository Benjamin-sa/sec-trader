'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface FilingLinkProps {
  accessionNumber: string;
  filedAt: string;
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export default function FilingLink({ 
  accessionNumber, 
  filedAt, 
  className = '',
  showIcon = false,
  label
}: FilingLinkProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only handle plain clicks (not ctrl/cmd/middle-click)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) {
      return; // Let the default Link behavior handle it
    }
    
    // Prevent any parent handlers from interfering
    e.stopPropagation();
    
    // Use router for navigation
    e.preventDefault();
    router.push(`/filing/${accessionNumber}`);
  };

  return (
    <Link
      href={`/filing/${accessionNumber}`}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors relative z-10 ${className}`}
      title="View filing details"
    >
      {showIcon && <DocumentTextIcon className="h-4 w-4" />}
      <span>{label || formatDate(filedAt)}</span>
    </Link>
  );
}
