'use client';

import React, { useEffect } from 'react';
import { useReciteStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useReciteStore();

  useEffect(() => {
    if (toasts.length === 0) return;

    // Auto-dismiss the latest toast after 3.5s
    const latestToast = toasts[toasts.length - 1];
    const timer = setTimeout(() => {
      removeToast(latestToast.id);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = 
          toast.type === 'success' ? CheckCircle2 :
          toast.type === 'error' ? XCircle :
          toast.type === 'warning' ? AlertTriangle :
          Info;
          
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border bg-white dark:bg-zinc-900 pointer-events-auto animate-in slide-in-from-right-5 fade-in duration-200",
              toast.type === 'success' ? 'border-emerald-500/30' :
              toast.type === 'error' ? 'border-rose-500/30' :
              toast.type === 'warning' ? 'border-amber-500/30' :
              'border-zinc-200 dark:border-zinc-800'
            )}
          >
            <Icon 
              className={cn(
                "w-5 h-5",
                toast.type === 'success' ? 'text-emerald-500' :
                toast.type === 'error' ? 'text-rose-500' :
                toast.type === 'warning' ? 'text-amber-500' :
                'text-zinc-500'
              )} 
            />
            <span className="text-sm font-sans font-medium text-zinc-800 dark:text-zinc-200">
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
