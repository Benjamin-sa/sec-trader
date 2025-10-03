import FilingPageClient from './FilingPageClient';

// Force dynamic rendering - SEC filings are constantly changing
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

export default function FilingPage() {
  return <FilingPageClient />;
}
