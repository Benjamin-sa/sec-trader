import InsiderPageClient from './InsiderPageClient';

// Force dynamic rendering - insider data changes based on query params
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

export default function InsiderIndexPage() {
  return <InsiderPageClient />;
}
