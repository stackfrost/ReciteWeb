import { create } from 'zustand';
import { MathBlock } from './parsers/math-parser';

export type ClaimCategory = 
  | 'Literature Claim' 
  | 'Instrumentation/Methodology' 
  | 'Numerical/Data Claim' 
  | 'Theoretical Assertion';

export type ClaimSeverity = 'High' | 'Medium' | 'Low';
export type ClaimStatus = 'pending' | 'accepted' | 'dismissed';

export interface SuggestedPaper {
  title: string;
  year: number;
  authors: string[];
  doi?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  url?: string;
  paperId?: string;
}

export interface Claim {
  id: string;
  text: string;
  category: ClaimCategory;
  severity: ClaimSeverity;
  status: ClaimStatus;
  lineIndex?: number;
  startIndex: number;
  endIndex: number;
  suggestedPapers?: SuggestedPaper[];
  acceptedPaper?: SuggestedPaper;
  isRetracted?: boolean;
  retractedReason?: string;
}

export type FilterCategory = 'All' | ClaimCategory;
export type FilterSeverity = 'All' | ClaimSeverity;
export type FilterStatus = 'All' | ClaimStatus;

interface Stats {
  totalClaims: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  retractedFound: number;
  acceptedCount: number;
}

interface CiteGuardState {
  // Document state
  rawText: string;
  parsedText: string;
  mathBlocks: Map<string, MathBlock>;
  documentTitle: string;
  fileFormat: 'tex' | 'docx' | 'txt';

  // Claims state
  claims: Claim[];
  activeClaimIndex: number;
  filteredClaims: Claim[];

  // Filters
  filterCategory: FilterCategory;
  filterSeverity: FilterSeverity;
  filterStatus: FilterStatus;
  searchQuery: string;

  // UI state
  isAuditing: boolean;
  isExporting: boolean;
  showExportModal: boolean;
  showSettings: boolean;
  sidebarCollapsed: boolean;
  inspectorTab: 'candidates' | 'health' | 'zotero';

  // Stats
  stats: Stats;

  // Document Actions
  setRawText: (text: string) => void;
  setParsedText: (text: string) => void;
  setMathBlocks: (blocks: Map<string, MathBlock>) => void;
  setDocumentTitle: (title: string) => void;
  setFileFormat: (format: 'tex' | 'docx' | 'txt') => void;

  // Claims Actions
  setClaims: (claims: Claim[]) => void;
  setActiveClaimIndex: (index: number) => void;
  nextClaim: () => void;
  prevClaim: () => void;
  jumpToClaim: (index: number) => void;

  // Filter actions
  setFilterCategory: (category: FilterCategory) => void;
  setFilterSeverity: (severity: FilterSeverity) => void;
  setFilterStatus: (status: FilterStatus) => void;
  setSearchQuery: (query: string) => void;
  applyFilters: () => void;

  // UI actions
  setIsAuditing: (value: boolean) => void;
  setIsExporting: (value: boolean) => void;
  setShowExportModal: (value: boolean) => void;
  setShowSettings: (value: boolean) => void;
  setInspectorTab: (tab: 'candidates' | 'health' | 'zotero') => void;
  toggleSidebar: () => void;

  // Claim Mutation Actions
  addSuggestedPapers: (claimId: string, papers: SuggestedPaper[]) => void;
  acceptCitation: (claimId: string, paper: SuggestedPaper) => void;
  markAsRetracted: (claimId: string, reason: string) => void;
  dismissClaim: (claimId: string) => void;

  // Reset
  reset: () => void;
}

/**
 * Helper to compute stats cleanly without code duplication
 */
function computeStats(claims: Claim[]): Stats {
  return {
    totalClaims: claims.length,
    highSeverity: claims.filter((c) => c.severity === 'High').length,
    mediumSeverity: claims.filter((c) => c.severity === 'Medium').length,
    lowSeverity: claims.filter((c) => c.severity === 'Low').length,
    retractedFound: claims.filter((c) => c.isRetracted).length,
    acceptedCount: claims.filter((c) => c.status === 'accepted').length,
  };
}

const initialState = {
  rawText: '',
  parsedText: '',
  mathBlocks: new Map<string, MathBlock>(),
  documentTitle: 'Untitled Manuscript',
  fileFormat: 'tex' as const,
  claims: [],
  activeClaimIndex: -1,
  filteredClaims: [],
  filterCategory: 'All' as FilterCategory,
  filterSeverity: 'All' as FilterSeverity,
  filterStatus: 'All' as FilterStatus,
  searchQuery: '',
  isAuditing: false,
  isExporting: false,
  showExportModal: false,
  showSettings: false,
  sidebarCollapsed: false,
  inspectorTab: 'candidates' as const,
  stats: {
    totalClaims: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    retractedFound: 0,
    acceptedCount: 0,
  },
};

export const useCiteGuardStore = create<CiteGuardState>((set, get) => ({
  ...initialState,

  setRawText: (text) => set({ rawText: text }),
  setParsedText: (text) => set({ parsedText: text }),
  setMathBlocks: (blocks) => set({ mathBlocks: blocks }),
  setDocumentTitle: (title) => set({ documentTitle: title }),
  setFileFormat: (format) => set({ fileFormat: format }),

  setClaims: (claims) => {
    const stats = computeStats(claims);
    set({ claims, stats, activeClaimIndex: claims.length > 0 ? 0 : -1 });
    get().applyFilters();
  },

  setActiveClaimIndex: (index) => set({ activeClaimIndex: index }),

  nextClaim: () => {
    const { filteredClaims, activeClaimIndex } = get();
    if (filteredClaims.length === 0) return;
    const next = activeClaimIndex >= filteredClaims.length - 1 ? 0 : activeClaimIndex + 1;
    set({ activeClaimIndex: next });
  },

  prevClaim: () => {
    const { filteredClaims, activeClaimIndex } = get();
    if (filteredClaims.length === 0) return;
    const prev = activeClaimIndex <= 0 ? filteredClaims.length - 1 : activeClaimIndex - 1;
    set({ activeClaimIndex: prev });
  },

  jumpToClaim: (index) => {
    const { filteredClaims } = get();
    if (index >= 0 && index < filteredClaims.length) {
      set({ activeClaimIndex: index });
    }
  },

  setFilterCategory: (category) => {
    set({ filterCategory: category });
    get().applyFilters();
  },

  setFilterSeverity: (severity) => {
    set({ filterSeverity: severity });
    get().applyFilters();
  },

  setFilterStatus: (status) => {
    set({ filterStatus: status });
    get().applyFilters();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  applyFilters: () => {
    const { claims, filterCategory, filterSeverity, filterStatus, searchQuery, activeClaimIndex } = get();
    let filtered = [...claims];

    if (filterCategory !== 'All') {
      filtered = filtered.filter((c) => c.category === filterCategory);
    }

    if (filterSeverity !== 'All') {
      filtered = filtered.filter((c) => c.severity === filterSeverity);
    }

    if (filterStatus !== 'All') {
      filtered = filtered.filter((c) => c.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) => c.text.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      );
    }

    // Safely clamp activeClaimIndex so it never exceeds new filteredClaims array length
    let safeIndex = activeClaimIndex;
    if (filtered.length === 0) {
      safeIndex = -1;
    } else if (safeIndex >= filtered.length) {
      safeIndex = filtered.length - 1;
    } else if (safeIndex < 0) {
      safeIndex = 0;
    }

    set({ filteredClaims: filtered, activeClaimIndex: safeIndex });
  },

  setIsAuditing: (value) => set({ isAuditing: value }),
  setIsExporting: (value) => set({ isExporting: value }),
  setShowExportModal: (value) => set({ showExportModal: value }),
  setShowSettings: (value) => set({ showSettings: value }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  addSuggestedPapers: (claimId, papers) => {
    const updatedClaims = get().claims.map((c) =>
      c.id === claimId ? { ...c, suggestedPapers: papers } : c
    );
    set({ claims: updatedClaims, stats: computeStats(updatedClaims) });
    get().applyFilters();
  },

  acceptCitation: (claimId, paper) => {
    const updatedClaims = get().claims.map((c) =>
      c.id === claimId ? { ...c, status: 'accepted' as const, acceptedPaper: paper } : c
    );
    set({ claims: updatedClaims, stats: computeStats(updatedClaims) });
    get().applyFilters();
  },

  markAsRetracted: (claimId, reason) => {
    const updatedClaims = get().claims.map((c) =>
      c.id === claimId ? { ...c, isRetracted: true, retractedReason: reason } : c
    );
    set({ claims: updatedClaims, stats: computeStats(updatedClaims) });
    get().applyFilters();
  },

  dismissClaim: (claimId) => {
    const updatedClaims = get().claims.filter((c) => c.id !== claimId);
    set({ claims: updatedClaims, stats: computeStats(updatedClaims) });
    get().applyFilters();
  },

  reset: () => set(initialState),
}));