import CompanyPageClient from './CompanyPageClient';
import { apiClient } from '@/lib/api-client';

// Pre-render a set of popular company pages by fetching real CIKs from the REST API
export async function generateStaticParams() {
  try {
    // Fetch latest trades from REST API
    const trades = await apiClient.getLatestTrades(200);

    const unique = new Set<string>();
    for (const trade of trades) {
      const raw = trade?.issuer_cik ?? '';
      const cleaned = String(raw).trim();
      if (cleaned) unique.add(cleaned);
      if (unique.size >= 150) break; // cap to avoid huge static output
    }

    return Array.from(unique).map((cik) => ({ cik }));
  } catch (err) {
    console.error('generateStaticParams(company) failed, falling back to empty list:', err);
    // If REST API is unreachable at build time, return an empty list to avoid build failure.
    // Pages will still work via client-side fetching when navigated from within the app.
    return [];
  }
}

export default function CompanyPage() {
  return <CompanyPageClient />;
}
