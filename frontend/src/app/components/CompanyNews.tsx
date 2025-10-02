'use client';

import { NewsArticle } from '@/lib/api-client';
import { NewspaperIcon, CalendarIcon, UserIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface CompanyNewsProps {
  news: NewsArticle[];
  loading: boolean;
  error: string | null;
  symbol: string;
}

export default function CompanyNews({ news, loading, error, symbol }: CompanyNewsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 10080) {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Latest News</h2>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-24 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <NewspaperIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error Loading News
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <p className="text-sm text-gray-500">
          News data may not be available for all symbols or may require a valid Alpaca API key.
        </p>
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <NewspaperIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No News Available
        </h3>
        <p className="text-gray-600">
          No recent news articles found for {symbol}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Latest News
          </h2>
          <span className="text-sm text-gray-500">
            {news.length} article{news.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {news.map((article) => (
          <article
            key={article.id}
            className="p-6 hover:bg-gray-50 transition-colors duration-150"
          >
            <div className="flex space-x-4">
              {/* Article Image */}
              {article.images && article.images.length > 0 && (
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.images[0].url}
                    alt={article.headline}
                    className="h-24 w-24 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              {/* Article Content */}
              <div className="flex-1 min-w-0">
                {/* Headline */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start group"
                  >
                    <span className="flex-1">{article.headline}</span>
                    <ArrowTopRightOnSquareIcon className="h-5 w-5 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </h3>
                
                {/* Summary */}
                {article.summary && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {article.summary}
                  </p>
                )}
                
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  {/* Date */}
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>{formatDate(article.createdAt)}</span>
                  </div>
                  
                  {/* Author */}
                  {article.author && (
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      <span>{article.author}</span>
                    </div>
                  )}
                  
                  {/* Source */}
                  {article.source && (
                    <div className="flex items-center">
                      <NewspaperIcon className="h-4 w-4 mr-1" />
                      <span>{article.source}</span>
                    </div>
                  )}
                  
                  {/* Related Symbols */}
                  {article.symbols && article.symbols.length > 0 && (
                    <div className="flex items-center gap-1">
                      {article.symbols.slice(0, 3).map((sym) => (
                        <span
                          key={sym}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {sym}
                        </span>
                      ))}
                      {article.symbols.length > 3 && (
                        <span className="text-gray-400">
                          +{article.symbols.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
