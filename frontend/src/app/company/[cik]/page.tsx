import CompanyPageClient from './CompanyPageClient';
import { apiClient } from '@/lib/api-client';

// Pre-render a set of popular company pages by fetching real CIKs from the REST API
export async function generateStaticParams() {
  try {
    // Fetch more trades to get more companies
    // We'll fetch from multiple endpoints to get a comprehensive list
    const [latestTrades, importantTrades, clusterBuys] = await Promise.all([
      apiClient.getLatestTrades(500).catch(() => []),
      apiClient.getImportantTrades(200).catch(() => []),
      apiClient.getClusterBuys(30).catch(() => [])
    ]);

    const unique = new Set<string>();
    
    // Add CIKs from latest trades
    for (const trade of latestTrades) {
      const raw = trade?.issuer_cik ?? '';
      const cleaned = String(raw).trim();
      if (cleaned) unique.add(cleaned);
    }
    
    // Add CIKs from important trades
    for (const trade of importantTrades) {
      const raw = trade?.issuer_cik ?? '';
      const cleaned = String(raw).trim();
      if (cleaned) unique.add(cleaned);
    }
    
    // Add CIKs from cluster buys
    for (const cluster of clusterBuys) {
      const cik = cluster?.trades?.[0]?.issuer_cik;
      if (cik) unique.add(String(cik).trim());
    }

    console.log(`Generating static params for ${unique.size} companies`);
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
