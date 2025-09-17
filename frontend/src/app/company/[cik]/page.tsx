import CompanyPageClient from './CompanyPageClient';

// Pre-render a set of popular company pages by fetching real CIKs from the API
export async function generateStaticParams() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-server.benjamin-sautersb.workers.dev';
  const limit = 200; // fetch a reasonable sample and dedupe
  try {
    const res = await fetch(`${apiBaseUrl}/api/trades/latest?limit=${limit}`, {
      // Explicit headers for CF worker
      headers: { 'Content-Type': 'application/json' },
      // Ensure this runs at build-time without caching issues
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch latest trades: ${res.status}`);
    const json = await res.json();
    const trades: Array<{ issuer_cik?: string | null }> = json?.data ?? [];

    const unique = new Set<string>();
    for (const t of trades) {
      const raw = t?.issuer_cik ?? '';
      const cleaned = String(raw).trim();
      if (cleaned) unique.add(cleaned);
      if (unique.size >= 150) break; // cap to avoid huge static output
    }

    return Array.from(unique).map((cik) => ({ cik }));
  } catch (err) {
    console.error('generateStaticParams(company) failed, falling back to empty list:', err);
    // If API is unreachable at build time, return an empty list to avoid build failure.
    // Pages will still work via client-side fetching when navigated from within the app.
    return [];
  }
}

export default function CompanyPage() {
  return <CompanyPageClient />;
}
