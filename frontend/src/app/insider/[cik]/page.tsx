import InsiderPageClient from '../InsiderPageClient';

// Force dynamic rendering - insider data changes frequently
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function InsiderDetailPage() {
  return <InsiderPageClient />;
}
