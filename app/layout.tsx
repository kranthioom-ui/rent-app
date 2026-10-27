import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hyderabad Rental Management Portal',
  description: 'Secure executive dashboard for property billing, tenant records, and automated collections.',
  openGraph: {
    title: 'Hyderabad Rental Management Portal',
    description: 'Secure executive dashboard for property billing and tenant tracking.',
    url: 'https://rent-app-mauve.vercel.app',
    siteName: 'Rental Management Portal',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hyderabad Rental Management Portal',
    description: 'Secure executive dashboard for property billing and tenant tracking.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#050507] text-[#ededed] antialiased">
        {children}
      </body>
    </html>
  );
}
