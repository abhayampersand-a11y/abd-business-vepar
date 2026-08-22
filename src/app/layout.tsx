import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/store/Providers';
import { Chrome } from '@/components/layout/Chrome';
import { Toaster } from '@/components/ui/Toaster';

export const metadata: Metadata = {
  title: 'Vyapar — Business Accounting & Billing',
  description:
    'Invoicing, inventory, parties, expenses, GST reports and banking for small businesses.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Chrome>{children}</Chrome>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
