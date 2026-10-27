import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://rent-app-mauve.vercel.app'),
  title: 'Hyderabad Rental Management Portal',
  description: 'Secure executive dashboard for property billing, tenant records, and automated collections.',
  openGraph: {
    title: 'Hyderabad Rental Management Portal',
    description: 'Secure executive dashboard for property billing and tenant tracking.',
    url: 'https://rent-app-mauve.vercel.app',
    siteName: 'Rental Management Portal',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: 'https://rent-app-mauve.vercel.app/logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Hyderabad Rental Management Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hyderabad Rental Management Portal',
    description: 'Secure executive dashboard for property billing and tenant tracking.',
    images: ['https://rent-app-mauve.vercel.app/logo.jpg'],
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
