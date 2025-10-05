import CompanyPageClient from './CompanyPageClient';

// Force dynamic rendering - data changes frequently and is unpredictable
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CompanyPage() {
  return <CompanyPageClient />;
}
