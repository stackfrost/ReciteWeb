'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy /dashboard route — all IDE logic now lives at / */
export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return null;
}