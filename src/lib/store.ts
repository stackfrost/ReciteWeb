import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MathBlock } from './parsers/math-parser';
import { LLMOrchestrator } from '@/services/llm-orchestrator';
import { LaTeXParser } from '@/services/latex-parser';
import { BibTeXParser } from '@/services/bibtex-parser';

// ─────────────────────────────────────────────────────────────────────────────
// § TYPES — Domain
// ─────────────────────────────────────────────────────────────────────────────

export type ClaimCategory =
  | 'Literature Claim'
  | 'Instrumentation/Methodology'
  | 'Numerical/Data Claim'
  | 'Theoretical Assertion';

export type ClaimSeverity = 'High' | 'Medium' | 'Low';
export type ClaimStatus = 'pending' | 'accepted' | 'dismissed';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// § A. DRM / LICENSE MANAGER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LicenseState — cryptographically signed seat token.
 * VALID        : token verified, offline grace period active (≤30 days).
 * EXPIRED      : grace window elapsed, requires re-sync with license server.
 * PENDING_SYNC : token issued but awaiting online verification.
 */
export type LicenseState = 'VALID' | 'EXPIRED' | 'PENDING_SYNC';

export interface LicenseSeat {
  licenseState: LicenseState;
  /** ISO timestamp of last successful license server sync */
  lastSyncAt: string | null;
  /** ISO timestamp of token expiry */
  expiresAt: string | null;
  /** Org/Seat identifier from B2B purchase */
  seatId: string | null;
  /** Remaining offline grace period in days */
  offlineGraceDaysRemaining: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// § B. STORAGE ADAPTER (local-first, cloud-ready)
// ─────────────────────────────────────────────────────────────────────────────

export type StorageBackend = 'IDB_LOCAL' | 'CLOUD_ENTERPRISE';

export interface StorageAdapter {
  backend: StorageBackend;
  /**
   * Current implementation: idb-keyval (IndexedDB).
   * Users persist .recite session files locally.
   * No data ever leaves the device on this tier.
   */
  localAdapter: 'IDB_KEYVAL';
  /**
   * Future stub: Cloud PostgreSQL via Supabase/Neon.
   * Swap to this adapter for Enterprise tier.
   * @stub — not yet implemented
   */
  cloudEnterpriseAdapter: 'CLOUD_PG_STUB' | null;
  maxWorkspaceSizeMB: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// § C. MULTI-VENDOR LLM ROUTER (BYOK)
// ─────────────────────────────────────────────────────────────────────────────

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'gemini';

export interface LLMProviderConfig {
  provider: LLMProvider;
  model: string;
  /** BYOK — stored in localStorage (never transmitted to ReciteAI servers) */
  apiKey: string | null;
  enabled: boolean;
}

export interface LLMRouter {
  /** The provider currently selected for all inference calls */
  activeProvider: LLMProvider;
  /** Per-provider key + model config matrix */
  providerMatrix: Record<LLMProvider, LLMProviderConfig>;
}

// ─────────────────────────────────────────────────────────────────────────────
// § D. WORKSPACE STATE
// ─────────────────────────────────────────────────────────────────────────────

export type WorkspaceStatus =
  | 'NO_WORKSPACE_MOUNTED'
  | 'MOUNTING'
  | 'MOUNTED'
  | 'AST_PARSING'
  | 'AST_PARSER_IDLE'
  | 'PREFLIGHT_RUNNING'
  | 'PREFLIGHT_COMPLETE'
  | 'ERROR';

export interface WorkspaceState {
  status: WorkspaceStatus;
  fileName: string | null;
  fileSizeBytes: number | null;
  mountedAt: string | null;
  fileHandle: any | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// § E. UI TELEMETRY (Status Bar)
// ─────────────────────────────────────────────────────────────────────────────

export interface NetworkTelemetry {
  isOnline: boolean;
  /** Last measured API round-trip latency in ms, null if no call made */
  apiLatencyMs: number | null;
  /** JS heap used in MB via performance.memory, null if API unavailable */
  memUsedMB: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// § FULL STORE INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

interface ReciteState {
  // ── Document ──────────────────────────────────────────────────────────────
  rawText: string;
  parsedText: string;
  mathBlocks: Map<string, MathBlock>;
  documentTitle: string;
  fileFormat: 'tex' | 'docx' | 'txt';
  bibtexContent: string | null;
  bibtexFileName: string | null;

  // ── Claims ────────────────────────────────────────────────────────────────
  claims: Claim[];
  activeClaimIndex: number;
  filteredClaims: Claim[];

  // ── Filters ───────────────────────────────────────────────────────────────
  filterCategory: FilterCategory;
  filterSeverity: FilterSeverity;
  filterStatus: FilterStatus;
  searchQuery: string;

  // ── UI ────────────────────────────────────────────────────────────────────
  isAuditing: boolean;
  isExporting: boolean;
  showExportModal: boolean;
  showSettings: boolean;
  showLegalWindow: boolean;
  sidebarCollapsed: boolean;
  inspectorTab: 'candidates' | 'health' | 'zotero';
  activeActivityView: 'explorer' | 'license' | 'settings' | null;

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats: Stats;

  // ── Global Modals & Notifications ─────────────────────────────────────────
  toasts: Toast[];
  confirmDialog: ConfirmDialog | null;

  // ── Enterprise Chassis ────────────────────────────────────────────────────
  license: LicenseSeat;
  storage: StorageAdapter;
  llmRouter: LLMRouter;
  workspace: WorkspaceState;
  telemetry: NetworkTelemetry;

  // ── Document Actions ──────────────────────────────────────────────────────
  setRawText: (text: string) => void;
  setParsedText: (text: string) => void;
  setMathBlocks: (blocks: Map<string, MathBlock>) => void;
  setDocumentTitle: (title: string) => void;
  setFileFormat: (format: 'tex' | 'docx' | 'txt') => void;
  setBibtexContent: (content: string | null, fileName?: string | null) => void;
  mountBibTex: (fileName: string, content: string) => void;
  unmountBibTex: () => void;

  // ── Claims Actions ────────────────────────────────────────────────────────
  setClaims: (claims: Claim[]) => void;
  setActiveClaimIndex: (index: number) => void;
  nextClaim: () => void;
  prevClaim: () => void;
  jumpToClaim: (index: number) => void;

  // ── Filter Actions ────────────────────────────────────────────────────────
  setFilterCategory: (category: FilterCategory) => void;
  setFilterSeverity: (severity: FilterSeverity) => void;
  setFilterStatus: (status: FilterStatus) => void;
  setSearchQuery: (query: string) => void;
  applyFilters: () => void;

  // ── UI Actions ────────────────────────────────────────────────────────────
  setIsAuditing: (value: boolean) => void;
  setIsExporting: (value: boolean) => void;
  setShowExportModal: (value: boolean) => void;
  setShowSettings: (value: boolean) => void;
  setShowLegalWindow: (value: boolean) => void;
  setInspectorTab: (tab: 'candidates' | 'health' | 'zotero') => void;
  toggleSidebar: () => void;
  setActiveActivityView: (view: 'explorer' | 'license' | 'settings' | null) => void;

  // ── Claim Mutations ───────────────────────────────────────────────────────
  addSuggestedPapers: (claimId: string, papers: SuggestedPaper[]) => void;
  acceptCitation: (claimId: string, paper: SuggestedPaper) => void;
  markAsRetracted: (claimId: string, reason: string) => void;
  dismissClaim: (claimId: string) => void;

  // ── Global Modals & Notifications Actions ───────────────────────────────
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirm: () => void;

  // ── Enterprise Chassis Actions ────────────────────────────────────────────
  setLicenseState: (state: LicenseState) => void;
  setLLMProvider: (provider: LLMProvider) => void;
  setLLMApiKey: (provider: LLMProvider, key: string) => void;
  setLLMModel: (provider: LLMProvider, model: string) => void;
  setWorkspaceStatus: (status: WorkspaceStatus) => void;
  mountWorkspace: (fileName: string, sizeBytes: number, fileHandle?: any) => void;
  unmountWorkspace: () => void;
  setTelemetry: (patch: Partial<NetworkTelemetry>) => void;

  // ── Reset ─────────────────────────────────────────────────────────────────
  reset: () => void;
  
  // ── Async Actions ─────────────────────────────────────────────────────────
  runAudit: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// § HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// § INITIAL STATE
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PROVIDER_MATRIX: Record<LLMProvider, LLMProviderConfig> = {
  openai:    { provider: 'openai',    model: 'gpt-4o',           apiKey: null, enabled: false },
  anthropic: { provider: 'anthropic', model: 'claude-opus-4-5',  apiKey: null, enabled: false },
  deepseek:  { provider: 'deepseek',  model: 'deepseek-chat',    apiKey: null, enabled: false },
  gemini:    { provider: 'gemini',    model: 'gemini-2.0-flash', apiKey: null, enabled: false },
};

const initialState = {
  rawText: '',
  parsedText: '',
  mathBlocks: new Map<string, MathBlock>(),
  documentTitle: 'Untitled Manuscript',
  fileFormat: 'tex' as const,
  bibtexContent: null as string | null,
  bibtexFileName: null as string | null,
  claims: [] as Claim[],
  activeClaimIndex: -1,
  filteredClaims: [] as Claim[],
  filterCategory: 'All' as FilterCategory,
  filterSeverity: 'All' as FilterSeverity,
  filterStatus: 'All' as FilterStatus,
  searchQuery: '',
  isAuditing: false,
  isExporting: false,
  showExportModal: false,
  showSettings: false,
  showLegalWindow: false,
  sidebarCollapsed: false,
  inspectorTab: 'candidates' as const,
  activeActivityView: null as 'explorer' | 'license' | 'settings' | null,
  stats: { totalClaims: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, retractedFound: 0, acceptedCount: 0 },
  license: {
    licenseState: 'VALID' as LicenseState,
    lastSyncAt: null as string | null,
    expiresAt: null as string | null,
    seatId: 'DEV-SEAT-001' as string | null,
    offlineGraceDaysRemaining: 30,
  },
  storage: {
    backend: 'IDB_LOCAL' as StorageBackend,
    localAdapter: 'IDB_KEYVAL' as const,
    cloudEnterpriseAdapter: null as 'CLOUD_PG_STUB' | null,
    maxWorkspaceSizeMB: 25,
  },
  llmRouter: {
    activeProvider: 'gemini' as LLMProvider,
    providerMatrix: DEFAULT_PROVIDER_MATRIX,
  },
  workspace: {
    status: 'NO_WORKSPACE_MOUNTED' as WorkspaceStatus,
    fileName: null as string | null,
    fileSizeBytes: null as number | null,
    mountedAt: null as string | null,
    fileHandle: null as any | null,
  },
  telemetry: {
    isOnline: true,
    apiLatencyMs: null as number | null,
    memUsedMB: null as number | null,
  },
  toasts: [] as Toast[],
  confirmDialog: null as ConfirmDialog | null,
};

// ─────────────────────────────────────────────────────────────────────────────
// § STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useReciteStore = create<ReciteState>()(
  persist(
    (set, get) => ({
      ...initialState,

  setRawText: (text) => set({ rawText: text }),
  setParsedText: (text) => set({ parsedText: text }),
  setMathBlocks: (blocks) => set({ mathBlocks: blocks }),
  setDocumentTitle: (title) => set({ documentTitle: title }),
  setFileFormat: (format) => set({ fileFormat: format }),
  setBibtexContent: (content, fileName = null) => set({ bibtexContent: content, bibtexFileName: fileName }),
  mountBibTex: (fileName, content) => set({ bibtexFileName: fileName, bibtexContent: content }),
  unmountBibTex: () => set({ bibtexFileName: null, bibtexContent: null }),

  setClaims: (claims) => {
    const stats = computeStats(claims);
    set({ claims, stats, activeClaimIndex: claims.length > 0 ? 0 : -1 });
    get().applyFilters();
  },
  setActiveClaimIndex: (index) => set({ activeClaimIndex: index }),
  nextClaim: () => {
    const { filteredClaims, activeClaimIndex } = get();
    if (!filteredClaims.length) return;
    set({ activeClaimIndex: activeClaimIndex >= filteredClaims.length - 1 ? 0 : activeClaimIndex + 1 });
  },
  prevClaim: () => {
    const { filteredClaims, activeClaimIndex } = get();
    if (!filteredClaims.length) return;
    set({ activeClaimIndex: activeClaimIndex <= 0 ? filteredClaims.length - 1 : activeClaimIndex - 1 });
  },
  jumpToClaim: (index) => {
    const { filteredClaims } = get();
    if (index >= 0 && index < filteredClaims.length) set({ activeClaimIndex: index });
  },

  setFilterCategory: (category) => { set({ filterCategory: category }); get().applyFilters(); },
  setFilterSeverity: (severity) => { set({ filterSeverity: severity }); get().applyFilters(); },
  setFilterStatus: (status) => { set({ filterStatus: status }); get().applyFilters(); },
  setSearchQuery: (query) => { set({ searchQuery: query }); get().applyFilters(); },
  applyFilters: () => {
    const { claims, filterCategory, filterSeverity, filterStatus, searchQuery, activeClaimIndex } = get();
    let filtered = [...claims];
    if (filterCategory !== 'All') filtered = filtered.filter((c) => c.category === filterCategory);
    if (filterSeverity !== 'All') filtered = filtered.filter((c) => c.severity === filterSeverity);
    if (filterStatus !== 'All') filtered = filtered.filter((c) => c.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => c.text.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    let safeIndex = activeClaimIndex;
    if (!filtered.length) safeIndex = -1;
    else if (safeIndex >= filtered.length) safeIndex = filtered.length - 1;
    else if (safeIndex < 0) safeIndex = 0;
    set({ filteredClaims: filtered, activeClaimIndex: safeIndex });
  },

  setIsAuditing: (value) => set({ isAuditing: value }),
  setIsExporting: (value) => set({ isExporting: value }),
  setShowExportModal: (value) => set({ showExportModal: value }),
  setShowSettings: (value) => set({ showSettings: value }),
  setShowLegalWindow: (value) => set({ showLegalWindow: value }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveActivityView: (view) => set({ activeActivityView: view }),

  addSuggestedPapers: (claimId, papers) => {
    const updatedClaims = get().claims.map((c) => c.id === claimId ? { ...c, suggestedPapers: papers } : c);
    set({ claims: updatedClaims, stats: computeStats(updatedClaims) });
    get().applyFilters();
  },
  acceptCitation: (claimId, paper) => {
    const updatedClaims = get().claims.map((c) => c.id === claimId ? { ...c, status: 'accepted' as const, acceptedPaper: paper } : c);
    set({ claims: updatedClaims, stats: computeStats(updatedClaims) });
    get().applyFilters();
  },
  markAsRetracted: (claimId, reason) => {
    const updatedClaims = get().claims.map((c) => c.id === claimId ? { ...c, isRetracted: true, retractedReason: reason } : c);
    set({ claims: updatedClaims, stats: computeStats(updatedClaims) });
    get().applyFilters();
  },
  dismissClaim: (claimId) => {
    const updatedClaims = get().claims.filter((c) => c.id !== claimId);
    set({ claims: updatedClaims, stats: computeStats(updatedClaims) });
    get().applyFilters();
  },

  // ── Global Modals & Notifications Actions ───────────────────────────────
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openConfirm: (title, message, onConfirm) =>
    set({ confirmDialog: { isOpen: true, title, message, onConfirm } }),
  closeConfirm: () =>
    set({ confirmDialog: null }),

  // ── Enterprise Chassis Actions ────────────────────────────────────────────
  setLicenseState: (state) =>
    set((s) => ({ license: { ...s.license, licenseState: state } })),

  setLLMProvider: (provider) =>
    set((s) => ({ llmRouter: { ...s.llmRouter, activeProvider: provider } })),

  setLLMApiKey: (provider, key) =>
    set((s) => ({
      llmRouter: {
        ...s.llmRouter,
        providerMatrix: {
          ...s.llmRouter.providerMatrix,
          [provider]: { ...s.llmRouter.providerMatrix[provider], apiKey: key, enabled: key.length > 0 },
        },
      },
    })),

  setLLMModel: (provider, model) =>
    set((s) => ({
      llmRouter: {
        ...s.llmRouter,
        providerMatrix: {
          ...s.llmRouter.providerMatrix,
          [provider]: { ...s.llmRouter.providerMatrix[provider], model },
        },
      },
    })),

  setWorkspaceStatus: (status) =>
    set((s) => ({ workspace: { ...s.workspace, status } })),

  mountWorkspace: (fileName, sizeBytes, fileHandle) =>
    set({
      workspace: {
        status: 'MOUNTED',
        fileName,
        fileSizeBytes: sizeBytes,
        mountedAt: new Date().toISOString(),
        fileHandle: fileHandle || null,
      },
    }),

  unmountWorkspace: () =>
    set({
      workspace: { status: 'NO_WORKSPACE_MOUNTED', fileName: null, fileSizeBytes: null, mountedAt: null, fileHandle: null },
      rawText: '',
      parsedText: '',
      claims: [],
      filteredClaims: [],
      activeClaimIndex: -1,
      stats: initialState.stats,
    }),

  setTelemetry: (patch) =>
    set((s) => ({ telemetry: { ...s.telemetry, ...patch } })),

  reset: () => set(initialState),

  runAudit: async () => {
    const { workspace, rawText, bibtexContent, llmRouter, setWorkspaceStatus, setIsAuditing, addToast } = get();
    if (workspace.status === 'NO_WORKSPACE_MOUNTED') return;

    setWorkspaceStatus('PREFLIGHT_RUNNING');
    setIsAuditing(true);

    try {
      const { activeProvider, providerMatrix } = llmRouter;
      const apiKey = providerMatrix[activeProvider]?.apiKey || '';
      
      const extractedClaims = LaTeXParser.scanDocument(rawText);
      const bibtexMap = BibTeXParser.parse(bibtexContent || '');

      const auditClaims = await LLMOrchestrator.executePreFlightAudit(
        extractedClaims,
        bibtexMap,
        activeProvider,
        apiKey
      );

      // Map AuditClaim to internal Claim structure
      const mappedClaims: Claim[] = auditClaims.map((ac, idx) => ({
        id: ac.id,
        text: ac.text,
        category: 'Literature Claim',
        severity: ac.severity as 'High' | 'Medium' | 'Low',
        status: 'pending',
        startIndex: 0,
        endIndex: ac.text.length,
      }));

      set({ claims: mappedClaims, filteredClaims: mappedClaims, activeClaimIndex: 0 });
      setWorkspaceStatus('PREFLIGHT_COMPLETE');
      addToast('Audit completed successfully', 'success');
    } catch (err: any) {
      setWorkspaceStatus('ERROR');
      addToast(`Audit failed: ${err.message}`, 'error');
    } finally {
      setIsAuditing(false);
    }
  },
}),
    {
      name: 'recite-enterprise-store',
      partialize: (state) => ({
        license: state.license,
        llmRouter: state.llmRouter,
        storage: state.storage,
        filterCategory: state.filterCategory,
        filterSeverity: state.filterSeverity,
        filterStatus: state.filterStatus,
        sidebarCollapsed: state.sidebarCollapsed,
        inspectorTab: state.inspectorTab,
      }),
    }
  )
);