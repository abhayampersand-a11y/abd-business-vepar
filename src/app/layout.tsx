import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/store/Providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
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
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
