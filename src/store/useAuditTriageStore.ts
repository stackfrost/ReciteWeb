import { create } from 'zustand';

export type TriageStatus = 'open' | 'review' | 'ignored' | 'critical' | 'resolved';
export type TriageFilter = 'all' | 'open' | 'review' | 'ignored' | 'resolved';

interface AuditTriageState {
  activeFilter: TriageFilter;
  triageMap: Record<string, TriageStatus>;
  selectedClaimId: string | null;

  setActiveFilter: (filter: TriageFilter) => void;
  setTriageStatus: (id: string, status: TriageStatus) => void;
  selectClaim: (id: string | null) => void;
  restoreIgnored: () => void;
  getTriageStatus: (id: string) => TriageStatus;
}

export const useAuditTriageStore = create<AuditTriageState>((set, get) => ({
  activeFilter: 'all',
  triageMap: {},
  selectedClaimId: null,

  setActiveFilter: (activeFilter) => set({ activeFilter }),

  setTriageStatus: (id, status) =>
    set((state) => ({
      triageMap: {
        ...state.triageMap,
        [id]: status,
      },
    })),

  selectClaim: (selectedClaimId) => set({ selectedClaimId }),

  restoreIgnored: () =>
    set((state) => {
      const newMap = { ...state.triageMap };
      Object.keys(newMap).forEach((id) => {
        if (newMap[id] === 'ignored') {
          delete newMap[id];
        }
      });
      return { triageMap: newMap };
    }),

  getTriageStatus: (id) => {
    return get().triageMap[id] || 'open';
  },
}));
