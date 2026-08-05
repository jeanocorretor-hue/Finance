'use client';

import { Dashboard } from '@/components/finance/dashboard';
import { FinanceProvider } from '@/lib/finance-store';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <FinanceProvider>
      <Dashboard />
    </FinanceProvider>
  );
}
