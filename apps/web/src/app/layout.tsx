import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agency System',
  description: 'Agency Estimation, Quotation & Business Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-text antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
