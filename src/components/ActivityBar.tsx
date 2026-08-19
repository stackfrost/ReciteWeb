'use client';

import React from 'react';
import { Files, Library, Settings, Download, Shield } from 'lucide-react';
import { useReciteStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function ActivityBar() {
  const {
    activeActivityView,
    setActiveActivityView,
    setShowSettings,
    setShowExportModal,
    license,
    workspace,
  } = useReciteStore();

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';

  const licColor =
    license.licenseState === 'VALID'
      ? 'text-emerald-400'
      : license.licenseState === 'PENDING_SYNC'
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <aside className="w-12 h-full bg-zinc-950/80 backdrop-blur-md border-r border-zinc-800/80 flex flex-col items-center py-3 flex-shrink-0 z-20 select-none">
      {/* Top Action Icons */}
      <div className="flex flex-col gap-4 w-full px-1.5">
        <ActivityButton
          active={activeActivityView === 'explorer'}
          onClick={() => setActiveActivityView(activeActivityView === 'explorer' ? null : 'explorer')}
          icon={<Files size={20} strokeWidth={1.5} />}
          title="Workspace Explorer (Ctrl+Shift+E)"
          badge={isMounted ? '1' : undefined}
        />

        <ActivityButton
          active={activeActivityView === 'license'}
          onClick={() => setShowSettings(true)}
          icon={<Shield size={20} strokeWidth={1.5} className={licColor} />}
          title={`Seat License: ${license.licenseState}`}
        />

        <ActivityButton
          active={false}
          onClick={() => setShowExportModal(true)}
          disabled={!isMounted}
          icon={<Download size={20} strokeWidth={1.5} />}
          title="Export .BIB Database (Ctrl+E)"
        />
      </div>

      {/* Bottom Settings Icon */}
      <div className="mt-auto flex flex-col gap-4 w-full px-1.5">
        <ActivityButton
          active={false}
          onClick={() => setShowSettings(true)}
          icon={<Settings size={20} strokeWidth={1.5} />}
          title="Configuration Matrix (Ctrl+,)"
        />
      </div>
    </aside>
  );
}

function ActivityButton({
  active,
  onClick,
  icon,
  title,
  disabled = false,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-full h-9 flex items-center justify-center rounded-lg transition-all relative group',
        disabled
          ? 'opacity-30 text-zinc-600 cursor-not-allowed'
          : active
          ? 'bg-zinc-800/90 text-zinc-100 shadow-sm before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2.5px] before:bg-emerald-400 before:rounded-r'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60'
      )}
    >
      {icon}
      {badge && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 border border-zinc-950" />
      )}
    </button>
  );
}