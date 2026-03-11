'use client';

import { TabToggle } from '@/components/navigation/TabToggle';

export default function SentimentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="app-container">
      <h1>Customer Review Sentiment Analyzer</h1>
      <TabToggle />
      <div className="content">{children}</div>
    </main>
  );
}
