import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from '@/components/I18nProvider';
import { Navigation } from '@/components/Navigation';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEC Insider Trading Analyzer",
  description: "Monitor insider trading activity and identify important transactions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <Navigation />
          {/* Add padding-bottom for mobile bottom nav */}
          <div className="pb-16 md:pb-0">
            {children}
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
