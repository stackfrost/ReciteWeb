import React from 'react';
import { Files, Library, Settings, Download } from 'lucide-react';

export default function ActivityBar() {
  return (
    <div className="w-12 h-full bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-4 flex-shrink-0 z-10">
      <div className="flex flex-col gap-6">
        <button className="text-zinc-400 hover:text-emerald-400 transition-colors" title="Manuscript Explorer">
          <Files strokeWidth={1.5} size={22} />
        </button>
        <button className="text-zinc-400 hover:text-emerald-400 transition-colors" title="Zotero Cloud Sync">
          <Library strokeWidth={1.5} size={22} />
        </button>
        <button className="text-zinc-400 hover:text-emerald-400 transition-colors" title="Export Pre-Flight .TEX">
          <Download strokeWidth={1.5} size={22} />
        </button>
      </div>
      
      <div className="mt-auto flex flex-col gap-6">
        <button className="text-zinc-400 hover:text-emerald-400 transition-colors" title="Engine Settings">
          <Settings strokeWidth={1.5} size={22} />
        </button>
      </div>
    </div>
  );
}