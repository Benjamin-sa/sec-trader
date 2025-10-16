'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { BellIcon } from '@heroicons/react/24/outline';

export default function AlertsPage() {
  const { isPending } = useSession();

  // AUTH SYSTEM DISABLED - Show disabled state
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading alert settings...</p>
        </div>
      </div>
    );
  }

  // Always show disabled state since auth is removed
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BellIcon className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Alerts Temporarily Disabled</h2>
        <p className="text-gray-600 mb-6">
          The alert system is currently being updated. Please check back later for notification preferences and insider trading alerts.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}