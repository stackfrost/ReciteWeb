import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MathBlock, parseMathBlocks } from './parsers/math-parser';
import { LLMOrchestrator } from '@/services/llm-orchestrator';
import { LaTeXParser, rehydrateQuarantinedMath, calculateLineNumber, extractContextSnippet } from '@/services/latex-parser';
import { BibTeXParser } from '@/services/bibtex-parser';
import { FileSystemService } from '@/services/file-system';
import { LicenseManager } from '@/services/license-manager';
import { type LLMProvider, getDefaultModel } from './models';

// ─────────────────────────────────────────────────────────────────────────────
// § TYPES — Domain
// ─────────────────────────────────────────────────────────────────────────────

export type ClaimCategory =
  | 'Literature Claim'
  | 'Instrumentation/Methodology'
  | 'Numerical/Data Claim'
  | 'Theoretical Assertion';

export type ClaimSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type ClaimStatus = 'pending' | 'accepted' | 'dismissed';

export interface DocMetrics {
  wordCount: number;
  tokenCount: number;
}

export function calculateDocMetrics(text: string): DocMetrics {
  if (!text || !text.trim()) {
    return { wordCount: 0, tokenCount: 0 };
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const tokenCount = Math.round(words * 1.3);
  return { wordCount: words, tokenCount };
}

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
  venue?: string;
  doi?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  url?: string;
  paperId?: string;
  bibtexKey?: string;
  matchScore?: number;
  abstractExcerpt?: string;
  abstractSnippet?: string;
  verificationStatus?: 'verified' | 'unverified' | 'rejected';
  bibtexEntry?: string;
}

export interface Claim {
  id: string;
  text: string;
  category: ClaimCategory;
  streamType?: 'integrity' | 'discovery';
  severity: ClaimSeverity;
  status: ClaimStatus;
  lineIndex?: number;
  startIndex: number;
  endIndex: number;
  fileId?: string; // Deterministic source tracking
  suggestedPapers?: SuggestedPaper[];
  acceptedPaper?: SuggestedPaper;
  isRetracted?: boolean;
  retractedReason?: string;
  suggestedFix?: string;
  context?: string;
  auditType?: 'MissingCitation' | 'WeakCitation' | 'Hallucination' | 'Misattribution' | 'Needs Literature' | 'Unsupported Assertion' | 'Weak Attribution' | 'Empirical Gap' | 'Syntax Mismatch';
  searchQuery?: string;
  citationKey?: string;
}

export type FilterCategory = 'All' | ClaimCategory;
export type FilterSeverity = 'All' | ClaimSeverity;
export type FilterStatus = 'All' | ClaimStatus;
export type StreamFilter = 'all' | 'integrity' | 'discovery';

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

export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'UNVERIFIED';

export interface LicenseState {
  key: string | null;
  status: LicenseStatus;
  lastChecked: number;
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
// LLMProvider is defined and exported from @/lib/models to keep
// the model registry as the single source of truth.
export type { LLMProvider } from './models';

export interface LLMProviderConfig {
  provider: LLMProvider;
  model: string;
  /**
   * BYOK — stored in session memory ONLY.
   * API keys are explicitly excluded from IndexedDB/localStorage persistence
   * via the `partialize` function at the bottom of this file.
   * They MUST NOT be written to any remote sync payload.
   */
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
  type: 'file' | 'directory';
  fileName: string | null;
  fileSizeBytes: number | null;
  mountedAt: string | null;
  fileHandle: any | null;
  projectFiles: Record<string, any>;
  activeFilePath: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// § E. UI TELEMETRY (Status Bar)
// ─────────────────────────────────────────────────────────────────────────────

export interface TelemetryState {
  astNodeCount: number;
  tokenPressure: number;
  lastWriteLatency: number;
  memoryUsage: number;
  // Keep for backwards compatibility
  isOnline?: boolean;
  apiLatencyMs?: number | null;
  memUsedMB?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// § F. TRANSIENT EDITOR STATE
// ─────────────────────────────────────────────────────────────────────────────

export interface DiagnosticPin {
  id: string;
  line: number;
  type: 'critical' | 'medium';
  message: string;
}

/**
 * DO NOT bind `cursorOffset` or `scrollLine` directly into React components via `useStore((state) => state.cursorOffset)`. High-frequency updates will cause severe re-render lag. Use `useStore.subscribe()` via DOM refs instead.
 */
export interface EditorState {
  cursorOffset: number;
  scrollLine: number;
  diagnosticPins: DiagnosticPin[];
}

// ─────────────────────────────────────────────────────────────────────────────
// § FULL STORE INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

interface ReciteState extends EditorState {
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
  streamFilter: StreamFilter;
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
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  editorPaneWidth: number;
  docMetrics: DocMetrics;
  inspectorTab: 'candidates' | 'health' | 'zotero';
  activeActivityView: 'explorer' | 'license' | 'settings' | null;
  softWrap: boolean;
  activeLineHighlight: number | null;

  // ── Audit Progress ─────────────────────────────────────────────────────
  auditProgress: string | null;

  // ── Security ──────────────────────────────────────────────────────────────
  /** True once the Stronghold vault has been unlocked for this session. */
  isVaultUnlocked: boolean;

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats: Stats;

  // ── Global Modals & Notifications ─────────────────────────────────────────
  toasts: Toast[];
  confirmDialog: ConfirmDialog | null;

  // ── Enterprise Chassis ────────────────────────────────────────────────────
  license: LicenseState;
  storage: StorageAdapter;
  llmRouter: LLMRouter;
  workspace: WorkspaceState;
  telemetry: TelemetryState;
  showTelemetry: boolean;
  semanticScholarKey: string | null;

  // ── Transient Editor State Actions ────────────────────────────────────────
  setCursorOffset: (offset: number) => void;
  setScrollLine: (line: number) => void;
  setDiagnosticPins: (pins: DiagnosticPin[]) => void;
  updateTelemetry: (metrics: Partial<TelemetryState>) => void;
  setShowTelemetry: (show: boolean) => void;

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
  setStreamFilter: (filter: StreamFilter) => void;
  setFilterCategory: (category: FilterCategory) => void;
  setFilterSeverity: (severity: FilterSeverity) => void;
  setFilterStatus: (status: FilterStatus) => void;
  setSearchQuery: (query: string) => void;
  applyFilters: () => void;

  // ── UI Actions ────────────────────────────────────────────────────
  setIsAuditing: (value: boolean) => void;
  setIsExporting: (value: boolean) => void;
  setShowExportModal: (value: boolean) => void;
  setShowSettings: (value: boolean) => void;
  setShowLegalWindow: (value: boolean) => void;
  setInspectorTab: (tab: 'candidates' | 'health' | 'zotero') => void;
  setSidebarOpen: (open: boolean) => void;
  setEditorPaneWidth: (width: number) => void;
  setSoftWrap: (wrap: boolean) => void;
  setActiveLineHighlight: (line: number | null) => void;
  toggleSidebar: () => void;
  setActiveActivityView: (view: 'explorer' | 'license' | 'settings' | null) => void;
  setVaultUnlocked: (value: boolean) => void;
  setAuditProgress: (msg: string | null) => void;

  // ── Claim Mutations ───────────────────────────────────────────────────────
  addSuggestedPapers: (claimId: string, papers: SuggestedPaper[]) => void;
  acceptCitation: (claimId: string, paper: SuggestedPaper) => void;
  insertCitationAndBib: (claimId: string, paper: SuggestedPaper) => void;
  undoLastPatch: () => void;
  markAsRetracted: (claimId: string, reason: string) => void;
  dismissClaim: (claimId: string) => void;
  applyFix: (claimId: string) => Promise<void>;

  // ── Global Modals & Notifications Actions ───────────────────────────────
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirm: () => void;

  // ── Enterprise Chassis Actions ────────────────────────────────────────────
  setLicenseStatus: (status: LicenseStatus) => void;
  updateLicense: (patch: Partial<LicenseState>) => void;
  activateLicense: (key: string) => Promise<void>;
  checkLicenseHeartbeat: () => Promise<void>;
  setLLMProvider: (provider: LLMProvider) => void;
  setLLMApiKey: (provider: LLMProvider, key: string) => void;
  setLLMModel: (provider: LLMProvider, model: string) => void;
  setWorkspaceStatus: (status: WorkspaceStatus) => void;
  mountWorkspace: (fileName: string, sizeBytes: number, fileHandle?: any) => void;
  mountDirectoryWorkspace: (dirName: string, files: Record<string, any>) => void;
  setActiveFile: (path: string) => void;
  unmountWorkspace: () => void;
  setTelemetry: (patch: Partial<TelemetryState>) => void;
  setSemanticScholarKey: (key: string | null) => void;

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
    highSeverity: claims.filter((c) => c.severity === 'High' || c.severity === 'Critical').length,
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
  anthropic:  { provider: 'anthropic',  model: getDefaultModel('anthropic'),  apiKey: null, enabled: false },
  openai:     { provider: 'openai',     model: getDefaultModel('openai'),     apiKey: null, enabled: false },
  google:     { provider: 'google',     model: getDefaultModel('google'),     apiKey: null, enabled: false },
  openrouter: { provider: 'openrouter', model: getDefaultModel('openrouter'), apiKey: null, enabled: false },
  ollama:     { provider: 'ollama',     model: getDefaultModel('ollama'),     apiKey: null, enabled: true  },
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
  streamFilter: 'all' as StreamFilter,
  filterCategory: 'All' as FilterCategory,
  filterSeverity: 'All' as FilterSeverity,
  filterStatus: 'All' as FilterStatus,
  searchQuery: '',
  isAuditing: false,
  isExporting: false,
  showExportModal: false,
  showSettings: false,
  showLegalWindow: false,
  sidebarOpen: true,
  sidebarCollapsed: false,
  editorPaneWidth: 50,
  docMetrics: { wordCount: 0, tokenCount: 0 } as DocMetrics,
  inspectorTab: 'candidates' as const,
  activeActivityView: null as 'explorer' | 'license' | 'settings' | null,
  softWrap: true,
  activeLineHighlight: null as number | null,
  isVaultUnlocked: false,
  auditProgress: null as string | null,
  stats: { totalClaims: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, retractedFound: 0, acceptedCount: 0 },
  license: {
    key: null,
    status: 'UNVERIFIED' as LicenseStatus,
    lastChecked: 0,
  } as LicenseState,
  storage: {
    backend: 'IDB_LOCAL' as StorageBackend,
    localAdapter: 'IDB_KEYVAL' as const,
    cloudEnterpriseAdapter: null as 'CLOUD_PG_STUB' | null,
    maxWorkspaceSizeMB: 25,
  },
  llmRouter: {
    activeProvider: 'anthropic' as LLMProvider,
    providerMatrix: DEFAULT_PROVIDER_MATRIX,
  },
  workspace: {
    status: 'NO_WORKSPACE_MOUNTED' as WorkspaceStatus,
    type: 'file' as const,
    fileName: null as string | null,
    fileSizeBytes: null as number | null,
    mountedAt: null as string | null,
    fileHandle: null as any | null,
    projectFiles: {} as Record<string, any>,
    activeFilePath: null as string | null,
  },
  telemetry: {
    astNodeCount: 0,
    tokenPressure: 0,
    lastWriteLatency: 0,
    memoryUsage: 0,
    isOnline: true,
    apiLatencyMs: null as number | null,
    memUsedMB: null as number | null,
  },
  showTelemetry: true,
  semanticScholarKey: null as string | null,
  cursorOffset: 0,
  scrollLine: 0,
  diagnosticPins: [] as DiagnosticPin[],
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

  setRawText: (text) => set({ rawText: text, docMetrics: calculateDocMetrics(text) }),
  setParsedText: (text) => set({ parsedText: text, docMetrics: calculateDocMetrics(text) }),
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
  setSemanticScholarKey: (key) => set({ semanticScholarKey: key }),
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

  setStreamFilter: (filter) => { set({ streamFilter: filter }); get().applyFilters(); },
  setFilterCategory: (category) => { set({ filterCategory: category }); get().applyFilters(); },
  setFilterSeverity: (severity) => { set({ filterSeverity: severity }); get().applyFilters(); },
  setFilterStatus: (status) => { set({ filterStatus: status }); get().applyFilters(); },
  setSearchQuery: (query) => { set({ searchQuery: query }); get().applyFilters(); },
  setSoftWrap: (wrap) => set({ softWrap: wrap }),
  setActiveLineHighlight: (line) => set({ activeLineHighlight: line }),
  applyFilters: () => {
    const { claims, streamFilter, filterCategory, filterSeverity, filterStatus, searchQuery, activeClaimIndex } = get();
    let filtered = [...claims];
    if (streamFilter === 'integrity') {
      filtered = filtered.filter((c) => c.streamType === 'integrity' || c.auditType === 'MissingCitation' || c.auditType === 'WeakCitation' || c.auditType === 'Syntax Mismatch');
    } else if (streamFilter === 'discovery') {
      filtered = filtered.filter((c) => c.streamType === 'discovery' || c.auditType === 'Unsupported Assertion' || c.auditType === 'Weak Attribution' || c.auditType === 'Empirical Gap' || c.auditType === 'Misattribution' || c.auditType === 'Needs Literature');
    }
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
  setSidebarOpen: (open) => set({ sidebarOpen: open, sidebarCollapsed: !open }),
  setEditorPaneWidth: (width) => set({ editorPaneWidth: width }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen, sidebarCollapsed: s.sidebarOpen })),
  setActiveActivityView: (view) => set({ activeActivityView: view }),
  setVaultUnlocked: (value) => set({ isVaultUnlocked: value }),

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
  insertCitationAndBib: (claimId, paper) => {
    const { claims, rawText, parsedText, bibtexContent, workspace, addToast } = get();
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) return;

    const { AtomicPatchEngine } = require('@/services/atomic-patch-engine');
    
    // 1. Deduplicate & format BibTeX entry
    const { updatedBib, assignedKey } = AtomicPatchEngine.appendBibtexWithDeduplication(bibtexContent, paper);

    // 2. Inject citation tag into manuscript text before punctuation or merged into \cite
    const { updatedTex } = AtomicPatchEngine.injectCitationIntoClaim(
      rawText || parsedText || '',
      bibtexContent,
      claim.text,
      assignedKey,
      claimId
    );

    const { text: parsed, mathBlocks } = parseMathBlocks(updatedTex);
    const docMetrics = calculateDocMetrics(parsed || updatedTex);

    // 3. Mark claim as accepted with paper details
    const updatedClaims = claims.map((c) =>
      c.id === claimId ? { ...c, status: 'accepted' as const, acceptedPaper: { ...paper, bibtexKey: assignedKey } } : c
    );

    // Auto-advance to the next unresolved finding
    const nextUnresolvedIdx = updatedClaims.findIndex((c) => c.status !== 'accepted');
    const nextIndex = nextUnresolvedIdx !== -1 ? nextUnresolvedIdx : 0;

    set({
      bibtexContent: updatedBib,
      rawText: updatedTex,
      parsedText: parsed,
      mathBlocks,
      docMetrics,
      claims: updatedClaims,
      activeClaimIndex: nextIndex,
      stats: computeStats(updatedClaims),
    });

    get().applyFilters();

    // 4. Synchronize useAuditStore
    if (typeof window !== 'undefined') {
      try {
        const { useAuditStore } = require('@/store/useAuditStore');
        useAuditStore.getState().resolveFinding(claimId);
      } catch {}
    }

    // 5. Persist to disk
    const { bibtexFileName } = get();
    AtomicPatchEngine.persistToDisk(
      workspace.fileName || 'main.tex',
      updatedTex,
      bibtexFileName || 'references.bib',
      updatedBib
    );

    addToast(`Citation @${assignedKey} appended to bibliography and injected into manuscript.`, 'success');
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

  applyFix: async (claimId) => {
    const { claims, rawText, parsedText, bibtexContent, bibtexFileName, workspace, addToast } = get();
    const claim = claims.find((c) => c.id === claimId);
    if (!claim || !claim.suggestedFix) {
      addToast('No suggested fix available for this claim.', 'warning');
      return;
    }

    const { AtomicPatchEngine } = require('@/services/atomic-patch-engine');

    const targetText = claim.text;
    const replacement = claim.suggestedFix;

    const { updatedTex } = AtomicPatchEngine.applyPatchToManuscript(
      rawText || parsedText || '',
      bibtexContent,
      targetText,
      replacement,
      claimId
    );

    const { text: parsed, mathBlocks } = parseMathBlocks(updatedTex);
    const docMetrics = calculateDocMetrics(parsed || updatedTex);

    const updatedClaims = claims.map((c) =>
      c.id === claimId ? { ...c, status: 'accepted' as const } : c
    );

    // Auto-advance to the next unresolved finding
    const nextUnresolvedIdx = updatedClaims.findIndex((c) => c.status !== 'accepted');
    const nextIndex = nextUnresolvedIdx !== -1 ? nextUnresolvedIdx : 0;

    set({
      rawText: updatedTex,
      parsedText: parsed,
      mathBlocks,
      docMetrics,
      claims: updatedClaims,
      activeClaimIndex: nextIndex,
      stats: computeStats(updatedClaims),
    });

    get().applyFilters();

    // Synchronize useAuditStore
    if (typeof window !== 'undefined') {
      try {
        const { useAuditStore } = require('@/store/useAuditStore');
        useAuditStore.getState().resolveFinding(claimId);
      } catch {}
    }

    // Persist to disk
    AtomicPatchEngine.persistToDisk(
      workspace.fileName || 'main.tex',
      updatedTex,
      bibtexFileName || 'references.bib',
      bibtexContent
    );

    addToast('Remediation patch applied to manuscript.', 'success');
  },

  undoLastPatch: () => {
    const { AtomicPatchEngine } = require('@/services/atomic-patch-engine');
    const snapshot = AtomicPatchEngine.undoLastPatch();

    if (!snapshot) {
      get().addToast('No applied patches to undo.', 'info');
      return;
    }

    const { claims, addToast, workspace, bibtexFileName } = get();
    const { text: parsed, mathBlocks } = parseMathBlocks(snapshot.previousTex);
    const docMetrics = calculateDocMetrics(parsed || snapshot.previousTex);

    const updatedClaims = claims.map((c) =>
      c.id === snapshot.findingId ? { ...c, status: 'pending' as const, acceptedPaper: undefined } : c
    );

    const targetIdx = updatedClaims.findIndex((c) => c.id === snapshot.findingId);

    set({
      rawText: snapshot.previousTex,
      parsedText: parsed,
      bibtexContent: snapshot.previousBib,
      mathBlocks,
      docMetrics,
      claims: updatedClaims,
      activeClaimIndex: targetIdx !== -1 ? targetIdx : 0,
      stats: computeStats(updatedClaims),
    });

    get().applyFilters();

    // Synchronize useAuditStore
    if (typeof window !== 'undefined') {
      try {
        const { useAuditStore } = require('@/store/useAuditStore');
        useAuditStore.setState((state: any) => ({
          findings: state.findings.map((f: any) =>
            f.id === snapshot.findingId ? { ...f, status: 'unresolved' } : f
          ),
          selectedFindingId: snapshot.findingId,
        }));
      } catch {}
    }

    // Persist rolled-back state to disk
    AtomicPatchEngine.persistToDisk(
      workspace.fileName || 'main.tex',
      snapshot.previousTex,
      bibtexFileName || 'references.bib',
      snapshot.previousBib
    );

    addToast('Undid last patch and restored previous document state.', 'info');
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
  setLicenseStatus: (status) =>
    set((s) => ({ license: { ...s.license, status } })),
  updateLicense: (patch) =>
    set((s) => ({ license: { ...s.license, ...patch } })),
  activateLicense: async (key) => {
    try {
      const refreshed = await LicenseManager.verifyLicenseWithServer(key);
      set({ license: refreshed });
      get().addToast('License successfully verified and activated.', 'success');
    } catch (err: any) {
      get().addToast(`License verification failed: ${err.message}`, 'error');
    }
  },
  checkLicenseHeartbeat: async () => {
    const { license } = get();
    const updated = await LicenseManager.checkHeartbeat(license);
    if (updated) {
      set({ license: updated });
      if (updated.status === 'UNVERIFIED') {
        get().addToast('License offline grace period expired. Please connect to the internet to verify your seat.', 'warning');
      }
    }
  },

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
        type: 'file',
        fileName,
        fileSizeBytes: sizeBytes,
        mountedAt: new Date().toISOString(),
        fileHandle: fileHandle || null,
        projectFiles: {},
        activeFilePath: null,
      },
    }),

  mountDirectoryWorkspace: (dirName, files) =>
    set({
      workspace: {
        status: 'MOUNTED',
        type: 'directory',
        fileName: dirName,
        fileSizeBytes: null,
        mountedAt: new Date().toISOString(),
        fileHandle: null,
        projectFiles: files,
        activeFilePath: null,
      },
    }),

  setActiveFile: (path) => {
    const { workspace } = get();
    if (workspace.type === 'directory' && workspace.projectFiles[path]) {
      const fileData = workspace.projectFiles[path];
      const { text: parsed, mathBlocks } = parseMathBlocks(fileData.text);
      set((s) => ({
        workspace: { ...s.workspace, activeFilePath: path, fileName: fileData.fileName, fileSizeBytes: fileData.fileSize, fileHandle: fileData.fileHandle },
        rawText: fileData.text,
        parsedText: parsed,
        mathBlocks: mathBlocks,
        docMetrics: calculateDocMetrics(parsed || fileData.text),
      }));
    }
  },

  unmountWorkspace: () =>
    set({
      workspace: { status: 'NO_WORKSPACE_MOUNTED', type: 'file', fileName: null, fileSizeBytes: null, mountedAt: null, fileHandle: null, projectFiles: {}, activeFilePath: null },
      rawText: '',
      parsedText: '',
      docMetrics: { wordCount: 0, tokenCount: 0 },
      claims: [],
      filteredClaims: [],
      activeClaimIndex: -1,
      stats: initialState.stats,
    }),

  updateTelemetry: (metrics) =>
    set((s) => ({ telemetry: { ...s.telemetry, ...metrics } })),
  setShowTelemetry: (show) => set({ showTelemetry: show }),
  setTelemetry: (patch) =>
    set((s) => ({ telemetry: { ...s.telemetry, ...patch } })),

  setCursorOffset: (offset) => set({ cursorOffset: offset }),
  setScrollLine: (line) => set({ scrollLine: line }),
  setDiagnosticPins: (pins) => set({ diagnosticPins: pins }),

  reset: () => set(initialState),

  setAuditProgress: (msg) => set({ auditProgress: msg }),

  runAudit: async () => {
    const { rawText, mathBlocks, bibtexContent, setWorkspaceStatus, setIsAuditing, setClaims, setTelemetry, addToast, setAuditProgress } = get();
    
    const textToAudit = rawText || '';
    if (!textToAudit.trim()) {
      addToast('Open or load a manuscript first to run audit.', 'warning');
      return;
    }

    setWorkspaceStatus('PREFLIGHT_RUNNING');
    setIsAuditing(true);
    setAuditProgress('Parsing LaTeX AST & Checking Local BibTeX...');

    try {
      const { ClaimExtractionOrchestrator } = await import('@/services/claim-extraction-orchestrator');
      const { useAuditStore } = await import('@/store/useAuditStore');

      const result = await ClaimExtractionOrchestrator.runFullDiscoveryPipeline(
        textToAudit,
        bibtexContent,
        (msg: string) => setAuditProgress(msg)
      );

      // Update API latency telemetry
      setTelemetry({ apiLatencyMs: result.latencyMs });

      // Convert MathBlocks Map to string Map for rehydration
      const tokenMap = new Map<string, string>();
      mathBlocks.forEach((block, key) => tokenMap.set(key, block.content));

      const finalClaims = result.reciteClaims.map((c) => ({
        ...c,
        text: rehydrateQuarantinedMath(c.text, tokenMap),
        suggestedFix: c.suggestedFix ? rehydrateQuarantinedMath(c.suggestedFix, tokenMap) : undefined,
      }));

      setClaims(finalClaims);

      // Hydrate useAuditStore
      useAuditStore.getState().setFindings(result.allFindings);

      // Synchronize findings format to useEditorStore
      if (typeof window !== 'undefined') {
        try {
          const { useEditorStore } = require('@/store/useEditorStore');
          const editorStoreFindings = finalClaims.map((c) => ({
            id: c.id,
            line: c.lineIndex || 1,
            index: c.startIndex,
            length: c.endIndex - c.startIndex,
            fileId: c.fileId,
            key: c.category,
            type: c.auditType || c.category,
            severity: c.severity,
            status: c.status === 'accepted' ? 'Resolved' : 'Unresolved',
            context: c.context,
            claim: c.text,
            searchQuery: c.searchQuery,
            suggestedFix: c.suggestedFix,
            verifiedSources: c.suggestedPapers,
          }));
          useEditorStore.getState().setFindings(editorStoreFindings);
        } catch {
          // Ignore sync errors
        }
      }

      setWorkspaceStatus('AST_PARSER_IDLE');
      addToast(`Audit complete: ${result.integrityFindings.length} integrity faults, ${result.discoveryFindings.length} literature discoveries (${result.latencyMs}ms)`, 'success');
    } catch (err: any) {
      console.error('[ReciteStore] Audit execution failed:', err);
      setWorkspaceStatus('ERROR');
      addToast(`Audit interrupted: ${err.message || 'Check network connection'}`, 'error');
    } finally {
      setIsAuditing(false);
      setAuditProgress(null);
    }
  },
}),
    {
      name: 'recite-enterprise-store',
      partialize: (state) => ({
        license: state.license,
        // LLM router: persist provider selection and model ONLY.
        // API keys are managed exclusively by SecurityVault (Stronghold / session-memory).
        // They MUST NOT be written to IndexedDB/localStorage.
        llmRouter: {
          activeProvider: state.llmRouter.activeProvider,
          providerMatrix: Object.fromEntries(
            Object.entries(state.llmRouter.providerMatrix).map(([k, v]) => [
              k,
              { provider: v.provider, model: v.model, apiKey: null, enabled: v.enabled },
            ])
          ) as typeof state.llmRouter.providerMatrix,
        },
        storage: state.storage,
        filterCategory: state.filterCategory,
        filterSeverity: state.filterSeverity,
        filterStatus: state.filterStatus,
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
        editorPaneWidth: state.editorPaneWidth,
        inspectorTab: state.inspectorTab,
      }),
    }
  )
);