/**
 * Data processing utilities for market data
 */

/**
 * Format news data for easier consumption
 */
export function formatNews(newsItems) {
  return newsItems.map((item) => ({
    id: item.id,
    headline: item.headline,
    summary: item.summary || null,
    author: item.author || null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    url: item.url,
    content: item.content || null,
    symbols: item.symbols || [],
    source: item.source || null,
    images: item.images || [],
  }));
}
