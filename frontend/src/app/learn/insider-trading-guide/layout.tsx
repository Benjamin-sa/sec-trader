import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insider Trading Guide | Learn Trading Strategies',
  description: 'Learn how to interpret insider trading signals, develop winning strategies, and avoid common pitfalls when following SEC Form 4 filings.',
};

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
