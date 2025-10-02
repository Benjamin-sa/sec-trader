import FilingPageClient from './FilingPageClient';
import { apiClient } from '@/lib/api-client';

// Pre-render a set of popular filing pages by fetching real accession numbers from the REST API
export async function generateStaticParams() {
  try {
    // Fetch more trades to get more filings
    const [latestTrades, importantTrades] = await Promise.all([
      apiClient.getLatestTrades(500).catch(() => []),
      apiClient.getImportantTrades(200).catch(() => [])
    ]);

    const unique = new Set<string>();
    
    // Add accession numbers from latest trades
    for (const trade of latestTrades) {
      const accessionNumber = trade?.accession_number ?? '';
      if (accessionNumber) unique.add(accessionNumber);
    }
    
    // Add accession numbers from important trades
    for (const trade of importantTrades) {
      const accessionNumber = trade?.accession_number ?? '';
      if (accessionNumber) unique.add(accessionNumber);
    }

    console.log(`Generating static params for ${unique.size} filings`);
    return Array.from(unique).map((accessionNumber) => ({ accessionNumber }));
  } catch (err) {
    console.error('generateStaticParams(filing) failed, falling back to empty list:', err);
    // If REST API is unreachable at build time, return an empty list to avoid build failure.
    // Pages will still work via client-side fetching when navigated from within the app.
    return [];
  }
}

export default function FilingPage() {
  return <FilingPageClient />;
}
