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
    const { claims, rawText, parsedText, bibtexContent, addToast } = get();
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) return;

    const bibKey = paper.bibtexKey || (paper.authors?.[0]?.toLowerCase()?.replace(/\W/g, '') || 'ref') + (paper.year || '2024');
    
    const entry = paper.bibtexEntry || `@article{${bibKey},
  title = {${paper.title}},
  author = {${paper.authors.join(' and ')}},
  journal = {${paper.venue || 'Physical Review Letters'}},
  year = {${paper.year}}
}`;

    let newBib = bibtexContent || '';
    if (!newBib.includes(bibKey)) {
      newBib = newBib.trim() ? `${newBib.trim()}\n\n${entry}` : entry;
    }

    let newRaw = rawText || '';
    let newParsed = parsedText || '';
    const citeCommand = `\\cite{${bibKey}}`;

    if (newRaw.includes(claim.text)) {
      if (claim.text.includes('\\cite{')) {
        const updatedText = claim.text.replace(/\\cite\{[^}]+\}/, citeCommand);
        newRaw = newRaw.replace(claim.text, updatedText);
        if (newParsed.includes(claim.text)) newParsed = newParsed.replace(claim.text, updatedText);
      } else {
        newRaw = newRaw.replace(claim.text, `${claim.text} ~${citeCommand}`);
        if (newParsed.includes(claim.text)) newParsed = newParsed.replace(claim.text, `${claim.text} ~${citeCommand}`);
      }
    }

    const updatedClaims = claims.map((c) =>
      c.id === claimId ? { ...c, status: 'accepted' as const, acceptedPaper: paper } : c
    );

    set({
      bibtexContent: newBib,
      rawText: newRaw,
      parsedText: newParsed,
      claims: updatedClaims,
      stats: computeStats(updatedClaims),
    });

    get().applyFilters();
    addToast(`Citation @${bibKey} appended to bibliography and inserted into manuscript.`, 'success');
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
    const { claims, rawText, workspace, addToast } = get();
    const claim = claims.find((c) => c.id === claimId);
    if (!claim || !claim.suggestedFix) {
      addToast('No suggested fix available for this claim.', 'warning');
      return;
    }

    const targetText = claim.text;
    const replacement = claim.suggestedFix;

    if (workspace.type === 'directory') {
      let targetFilePath = null;
      let targetFileData = null;
      let updatedFileText = '';
      let scopedSuccess = false;

      for (const [path, fileData] of Object.entries(workspace.projectFiles)) {
        let scoped = false;
        let fileText = fileData.text;
        
        if (claim.context && claim.context.trim().length > 0) {
          const contextStr = claim.context.trim();
          const contextIndex = fileText.indexOf(contextStr);
          if (contextIndex !== -1 && contextStr.includes(targetText)) {
            const modifiedContext = contextStr.replace(targetText, replacement);
            fileText = fileText.slice(0, contextIndex) + modifiedContext + fileText.slice(contextIndex + contextStr.length);
            scoped = true;
          } else {
            const paragraphs = fileText.split(/\\n\\s*\\n/);
            let foundIdx = -1;
            for (let i = 0; i < paragraphs.length; i++) {
              const p = paragraphs[i];
              if (p.includes(targetText) && (contextStr.includes(p.slice(0, 30)) || p.includes(contextStr.slice(0, 30)))) {
                paragraphs[i] = p.replace(targetText, replacement);
                foundIdx = i;
                break;
              }
            }
            if (foundIdx !== -1) {
              fileText = paragraphs.join('\\n\\n');
              scoped = true;
            }
          }
        }
        
        if (!scoped) {
          const occurrences = fileText.split(targetText).length - 1;
          if (occurrences > 0) {
            fileText = fileText.replace(targetText, replacement);
            scoped = true;
          }
        }

        if (scoped && fileText !== fileData.text) {
          targetFilePath = path;
          targetFileData = fileData;
          updatedFileText = fileText;
          break;
        }
      }

      if (!targetFilePath || !targetFileData) {
        addToast('Could not locate the original claim text in any project file.', 'error');
        return;
      }

      try {
        await FileSystemService.saveFile(targetFileData.fileHandle, updatedFileText);
        addToast(`Remediation applied and saved to ${targetFileData.fileName}.`, 'success');
      } catch (err: any) {
        addToast(`Failed to save ${targetFileData.fileName}: ${err.message}`, 'warning');
        return;
      }

      const updatedClaims = claims.filter((c) => c.id !== claimId);
      
      set((s) => {
        const nextProjectFiles = { ...s.workspace.projectFiles };
        nextProjectFiles[targetFilePath as string] = { ...targetFileData, text: updatedFileText };
        
        const updates: Partial<typeof s> = {
          claims: updatedClaims,
          stats: computeStats(updatedClaims),
          workspace: { ...s.workspace, projectFiles: nextProjectFiles }
        };
        
        if (s.workspace.activeFilePath === targetFilePath) {
          const { text: parsed, mathBlocks } = parseMathBlocks(updatedFileText);
          updates.rawText = updatedFileText;
          updates.parsedText = parsed;
          updates.mathBlocks = mathBlocks;
          updates.docMetrics = calculateDocMetrics(parsed || updatedFileText);
        }
        return updates;
      });
      get().applyFilters();
      return;
    }

    let updatedRawText = rawText;
    let scopedSuccess = false;

    // 1. Context-Scoped Block Replacement
    if (claim.context && claim.context.trim().length > 0) {
      const contextStr = claim.context.trim();
      const contextIndex = rawText.indexOf(contextStr);

      if (contextIndex !== -1 && contextStr.includes(targetText)) {
        const modifiedContext = contextStr.replace(targetText, replacement);
        updatedRawText =
          rawText.slice(0, contextIndex) +
          modifiedContext +
          rawText.slice(contextIndex + contextStr.length);
        scopedSuccess = true;
      } else {
        // Search by paragraph boundaries if exact context string isn't continuous
        const paragraphs = rawText.split(/\n\s*\n/);
        let foundIdx = -1;

        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];
          if (
            p.includes(targetText) &&
            (contextStr.includes(p.slice(0, 30)) || p.includes(contextStr.slice(0, 30)))
          ) {
            paragraphs[i] = p.replace(targetText, replacement);
            foundIdx = i;
            break;
          }
        }

        if (foundIdx !== -1) {
          updatedRawText = paragraphs.join('\n\n');
          scopedSuccess = true;
        }
      }
    }

    // 2. Fallback if context scoping could not be established
    if (!scopedSuccess) {
      const occurrences = rawText.split(targetText).length - 1;

      if (occurrences === 0) {
        addToast('Could not locate the original claim text in manuscript. Please review manually.', 'error');
        return;
      } else if (occurrences === 1) {
        updatedRawText = rawText.replace(targetText, replacement);
        addToast('Context block not found. Replaced unique text match — verify manuscript.', 'info');
      } else {
        updatedRawText = rawText.replace(targetText, replacement);
        addToast(
          `Warning: Multiple matches (${occurrences}) found without scoped context. Replaced first match — please manually review.`,
          'warning'
        );
      }
    }

    // Re-parse the document & update docMetrics
    const { text: parsed, mathBlocks } = parseMathBlocks(updatedRawText);
    const docMetrics = calculateDocMetrics(parsed || updatedRawText);

    // Remove the claim from the list
    const updatedClaims = claims.filter((c) => c.id !== claimId);

    set({
      rawText: updatedRawText,
      parsedText: parsed,
      mathBlocks,
      docMetrics,
      claims: updatedClaims,
      stats: computeStats(updatedClaims),
    });
    get().applyFilters();

    // Persist to disk if file handle exists
    if (workspace.fileHandle) {
      try {
        await FileSystemService.saveFile(workspace.fileHandle, updatedRawText);
        addToast('Remediation applied and saved to disk.', 'success');
      } catch (err: any) {
        addToast(`Remediation applied in memory but failed to save: ${err.message}`, 'warning');
      }
    } else {
      // Prompt local save via showSaveFilePicker
      try {
        if ('showSaveFilePicker' in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: workspace.fileName || 'manuscript.tex',
            types: [{
              description: 'LaTeX Files',
              accept: { 'text/plain': ['.tex', '.txt'] },
            }],
          });
          await FileSystemService.saveFile(handle, updatedRawText);
          addToast('Remediation applied and saved to new file.', 'success');
        } else {
          // Fallback: Blob download
          const blob = new Blob([updatedRawText], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = workspace.fileName || 'manuscript.tex';
          a.click();
          URL.revokeObjectURL(url);
          addToast('Remediation applied. File downloaded.', 'success');
        }
      } catch (err: any) {
        if (err.message !== 'USER_ABORTED' && err.name !== 'AbortError') {
          addToast(`Remediation applied in memory: ${err.message}`, 'warning');
        } else {
          addToast('Remediation applied in memory. Disk save cancelled.', 'info');
        }
      }
    }
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
    const { workspace, rawText, mathBlocks, bibtexContent, llmRouter, setWorkspaceStatus, setIsAuditing, setClaims, setTelemetry, addToast, setAuditProgress } = get();
    if (workspace.status === 'NO_WORKSPACE_MOUNTED') return;

    setWorkspaceStatus('PREFLIGHT_RUNNING');
    setIsAuditing(true);
    setAuditProgress('Preparing audit...');

    try {
      const { activeProvider, providerMatrix } = llmRouter;
      const config = providerMatrix[activeProvider];
      const apiKey = config?.apiKey || '';
      const model = config?.model;
      
      let textToAudit = rawText;
      let sourceMap = undefined;
      if (workspace.type === 'directory') {
        const { stitchProject } = require('@/services/document-stitcher');
        const rootFileId = workspace.activeFilePath || 'main.tex';
        
        // Map projectFiles (VirtualProjectFile) to LocalFile format expected by stitchProject
        const fileTree: Record<string, any> = {};
        for (const [path, fileData] of Object.entries(workspace.projectFiles)) {
          fileTree[path] = { path, name: path.split('/').pop() || path, content: fileData.text };
        }
        
        const stitched = stitchProject(rootFileId, fileTree);
        textToAudit = stitched.stitchedText;
        sourceMap = stitched.sourceMap;
      }
      
      const extractedClaims = LaTeXParser.scanDocument(textToAudit, sourceMap);
      const bibtexMap = BibTeXParser.parse(bibtexContent || '');

      const result = await LLMOrchestrator.executePreFlightAudit(
        extractedClaims,
        bibtexMap,
        activeProvider,
        apiKey,
        model,
        (msg: string) => setAuditProgress(msg)
      );

      // Update API latency telemetry
      setTelemetry({ apiLatencyMs: result.latencyMs });

      // Convert MathBlocks Map to string Map for rehydration
      const tokenMap = new Map<string, string>();
      mathBlocks.forEach((block, key) => tokenMap.set(key, block.content));

      // Map AuditClaim to internal Claim structure, preserving suggestedFix and context
      const mappedClaims: Claim[] = result.claims.map((ac) => {
        const rehydratedText = rehydrateQuarantinedMath(ac.text, tokenMap);
        
        // Recover file coordinates from the original ExtractedClaim generated by the parser
        const originalASTClaim = extractedClaims.find(c => c.id === ac.id);
        
        let startIndex = 0;
        let lineIndex = 1;
        let fileId = undefined;
        
        if (originalASTClaim) {
          startIndex = originalASTClaim.index ?? 0;
          lineIndex = originalASTClaim.line ?? 1;
          fileId = originalASTClaim.fileId;
        } else {
          // Fallback root search if LLM hallucinates an ID
          let idx = textToAudit.indexOf(ac.text);
          if (idx === -1) idx = textToAudit.indexOf(rehydratedText);
          if (idx === -1 && ac.text.length > 20) {
            idx = textToAudit.indexOf(ac.text.slice(0, 20));
          }
          startIndex = idx !== -1 ? idx : 0;
          lineIndex = idx !== -1 ? calculateLineNumber(textToAudit, idx) : 1;
        }

        const context = ac.context || extractContextSnippet(textToAudit, startIndex, rehydratedText.length);
        
        return {
          id: ac.id,
          text: rehydratedText,
          category: 'Literature Claim' as ClaimCategory,
          severity: ac.severity === 'Critical' ? 'Critical' : ac.severity as ClaimSeverity,
          status: 'pending' as ClaimStatus,
          startIndex,
          endIndex: startIndex + rehydratedText.length,
          lineIndex,
          fileId, // Pass through fileId to support cross-file navigation
          suggestedFix: ac.suggestedFix ? rehydrateQuarantinedMath(ac.suggestedFix, tokenMap) : undefined,
          context,
          auditType: ac.type,
          searchQuery: ac.searchQuery,
        };
      });

      // Merge claims uniquely to ensure deterministic + LLM findings are both preserved
      const currentClaims = get().claims || [];
      const existingIds = new Set(currentClaims.map(c => c.id));
      const newUniqueClaims = mappedClaims.filter(c => !existingIds.has(c.id));
      const allMerged = [...currentClaims, ...newUniqueClaims];
      setClaims(allMerged);

      // Synchronize findings format to useEditorStore
      if (typeof window !== 'undefined') {
        try {
          const { useEditorStore } = require('@/store/useEditorStore');
          const editorStoreFindings = allMerged.map(c => ({
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
            raw: c,
          }));
          useEditorStore.getState().addFindings(editorStoreFindings);

          const workspacePath = typeof window !== 'undefined' 
            ? require('@/store/useWorkspaceStore').useWorkspaceStore.getState().workspacePath 
            : null;
          if (workspacePath) {

            try {
              const { writeReciteCache } = require('@/services/cache-manager');
              const toCache = editorStoreFindings.map((f: any) => ({
                id: f.id,
                fileId: f.fileId || 'main.tex',
                line: f.line || 1,
                index: f.index || 0,
                length: f.length || 0,
                claim: f.claim || '',
                type: f.type || 'Needs Literature',
                severity: f.severity || 'Medium',
                resolved: f.status === 'Resolved',
              }));
              await writeReciteCache(workspacePath, toCache);
            } catch (cacheErr) {
              console.warn('[ReciteStore] Failed to write cache:', cacheErr);
            }
          }
        } catch (e) {
          console.warn('[ReciteStore] Sync to editor store skipped:', e);
        }
      }


      setWorkspaceStatus('PREFLIGHT_COMPLETE');
      addToast(`Audit complete: ${mappedClaims.length} findings in ${result.latencyMs}ms`, 'success');
    } catch (err: any) {
      setWorkspaceStatus('ERROR');
      addToast(`Audit failed: ${err.message}`, 'error');
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