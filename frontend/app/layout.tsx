import './globals.css';

export const metadata = {
  title: 'Customer Review Sentiment Analyzer',
  description: 'Analyze customer review sentiment with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
