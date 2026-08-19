'use client';

import React, { useEffect } from 'react';
import { useReciteStore } from '@/lib/store';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal() {
  const { confirmDialog, closeConfirm } = useReciteStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmDialog?.isOpen) {
        e.preventDefault();
        closeConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, closeConfirm]);

  if (!confirmDialog?.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-100 font-sans">
      <div className="relative w-[400px] max-w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans select-none animate-in zoom-in-95 duration-100">
        
        {/* Header */}
        <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 mr-2">
              <div
                onClick={closeConfirm}
                className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer shadow-xs"
              />
              <div className="w-3 h-3 rounded-full bg-amber-500/80 opacity-60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 opacity-60" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
              CONFIRM ACTION
            </span>
          </div>

          <button
            onClick={closeConfirm}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex gap-4">
          <div className="p-2.5 h-fit bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{confirmDialog.title}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">{confirmDialog.message}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex justify-end gap-2.5">
          <button
            onClick={closeConfirm}
            className="px-4 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              confirmDialog.onConfirm();
              closeConfirm();
            }}
            className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
          >
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
}
