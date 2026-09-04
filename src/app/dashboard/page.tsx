'use client';

import React, { Suspense } from 'react';
import PIComplianceDashboard from '@/components/dashboard/PIComplianceDashboard';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05070d] flex items-center justify-center text-zinc-500 font-mono text-xs">
          Loading PI Compliance Hub...
        </div>
      }
    >
      <PIComplianceDashboard />
    </Suspense>
  );
}