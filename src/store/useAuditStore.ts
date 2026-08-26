import { create } from 'zustand';
import {
  AuditFinding,
  FindingCategory,
  AgenticPipelineTelemetry,
  AgenticTraceNode,
  VerifiedLiteratureSource,
} from '@/types/audit';

export const INITIAL_DEMO_FINDINGS: AuditFinding[] = [
  {
    id: 'finding-1',
    line: 64,
    category: 'bib_mismatch',
    streamType: 'integrity',
    severity: 'Medium',
    type: 'Missing BibTeX Key',
    citationKey: 'zheng2024_unresolved',
    context: 'RF phase coherence was sustained by a custom double-shielded semi-rigid coaxial transmission line designed to maintain insertion loss below 0.45 dB/m at 180 MHz \\cite{zheng2024_unresolved}.',
    suggestedPatch: {
      diffRemove: '\\cite{zheng2024_unresolved}',
      diffAdd: '\\cite{lawson2021}',
    },
    verifiedSources: [],
    status: 'unresolved',
  },
  {
    id: 'finding-2',
    line: 82,
    category: 'literature_discovery',
    streamType: 'discovery',
    severity: 'Medium',
    type: 'Unsupported Assertion',
    claimText: 'High-field continuous-wave optical spectroscopy confirms absence of single-particle gap openings',
    context: 'High-field continuous-wave optical spectroscopy confirms the absence of single-particle gap openings or structural dimerization down to 45 mK.',
    suggestedPatch: {
      diffRemove: 'down to 45 mK.',
      diffAdd: 'down to 45 mK ~\\cite{shimizu2003}.',
    },
    verifiedSources: [
      {
        title: 'Spin Liquid State in an Organic Spin-1/2 Triangular Lattice Antiferromagnet κ-(BEDT-TTF)2Cu2(CN)3',
        authors: ['Shimizu, Y.', 'Miyagawa, K.', 'Kanoda, K.', 'Maesato, M.', 'Saito, G.'],
        year: 2003,
        venue: 'Physical Review Letters',
        doi: '10.1103/PhysRevLett.91.107001',
        bibtexKey: 'shimizu2003',
        relevanceScore: 0.96,
        abstractSnippet: 'We report 13C NMR and optical spectroscopy measurements of the organic triangular lattice compound showing no indication of magnetic ordering or gap opening down to 32 mK with finite Knight shift.',
        abstractExcerpt: 'We report 13C NMR and optical spectroscopy measurements showing no indication of magnetic ordering down to 32 mK.',
        verificationStatus: 'verified',
        provenance: 'openalex',
        entailmentStatus: 'entailed',
      },
      {
        title: 'NMR and NQR Studies of Low-Dimensional Spin Liquid and Quantum Frustrated Magnets',
        authors: ['Itoh, Yutaka', 'Machi, Takato', 'Koshizuka, Naoki'],
        year: 1998,
        venue: 'Physical Review B',
        doi: '10.1103/PhysRevB.58.3458',
        bibtexKey: 'itoh1998',
        relevanceScore: 0.88,
        abstractSnippet: 'Nuclear magnetic resonance investigations into spin susceptibility scaling and gapless excitations in low-dimensional frustrated triangular antiferromagnets.',
        abstractExcerpt: 'Nuclear magnetic resonance investigations into spin susceptibility scaling in frustrated antiferromagnets.',
        verificationStatus: 'verified',
        provenance: 'crossref',
        entailmentStatus: 'tenuous',
        hedgingSuggestion: 'providing preliminary NMR indications consistent with gapless behavior',
      },
    ],
    status: 'unresolved',
  },
  {
    id: 'finding-3',
    line: 74,
    category: 'literature_discovery',
    streamType: 'discovery',
    severity: 'Critical',
    type: 'Weak Attribution',
    claimText: 'directly verifying gapless fermionic spinon excitations with constant density of states',
    context: 'Our high-resolution spectra reveal that K(T) remains finite as T -> 0 K, directly verifying gapless fermionic spinon excitations with a constant density of states at the Fermi level.',
    suggestedPatch: {
      diffRemove: 'Fermi level \\cite{itoh1998}.',
      diffAdd: 'Fermi level \\cite{itoh1998,imai1993}.',
    },
    verifiedSources: [
      {
        title: '63Cu Spin-Lattice Relaxation Rate and Knight Shift in Underdoped Cuprates and Organic Superconductors',
        authors: ['Imai, Takashi', 'Slichter, Charles P.', 'Yoshimura, K.', 'Kosuge, K.'],
        year: 1993,
        venue: 'Physical Review Letters',
        doi: '10.1103/PhysRevLett.70.1002',
        bibtexKey: 'imai1993',
        relevanceScore: 0.92,
        abstractSnippet: 'Direct experimental observation of finite low-frequency spin susceptibility and Korringa scaling indicative of Fermi surface spinon excitations.',
        abstractExcerpt: 'Direct experimental observation of finite low-frequency spin susceptibility indicative of spinon excitations.',
        verificationStatus: 'verified',
        provenance: 'openalex',
        entailmentStatus: 'entailed',
      },
    ],
    status: 'unresolved',
  },
  {
    id: 'finding-4',
    line: 56,
    category: 'bib_mismatch',
    streamType: 'integrity',
    severity: 'Low',
    type: 'Unreferenced Citation Key',
    citationKey: 'shimizu2003',
    context: 'Frustrated quantum magnets with S = 1/2 degrees of freedom on triangular lattices provide a benchmark platform for realizing gapless quantum spin liquid (QSL) states \\cite{shimizu2003}.',
    suggestedPatch: {
      diffRemove: '\\cite{shimizu2003}',
      diffAdd: '\\cite{shimizu2003,itoh1998}',
    },
    verifiedSources: [],
    status: 'unresolved',
  },
];

export interface AuditState {
  findings: AuditFinding[];
  selectedFindingId: string | null;
  activeFilter: 'all' | FindingCategory;
  isAuditing: boolean;
  activeTab: 'remediation' | 'sources' | 'integrity' | 'telemetry' | 'zotero';
  
  // Agentic Telemetry State
  auditMode: 'fast_ast' | 'deep_agentic_rag';
  telemetry: AgenticPipelineTelemetry | null;
  activeTraceClaimId: string | null;
  abortController: AbortController | null;

  setFindings: (findings: AuditFinding[]) => void;
  setSelectedFindingId: (id: string | null) => void;
  setActiveFilter: (activeFilter: 'all' | FindingCategory) => void;
  setActiveTab: (tab: 'remediation' | 'sources' | 'integrity' | 'telemetry' | 'zotero') => void;
  setAuditMode: (mode: 'fast_ast' | 'deep_agentic_rag') => void;
  setTelemetry: (telemetry: AgenticPipelineTelemetry | null) => void;
  setActiveTraceClaimId: (id: string | null) => void;
  cancelActiveAudit: () => void;
  resolveFinding: (id: string) => void;
  dismissFinding: (id: string) => void;
  restoreFinding: (id: string) => void;
  copyCitationAndBib: (id: string, source: any) => void;
  groupFindingsBySection: (texContent: string) => void;
  runAudit: (forceBypassCache?: boolean) => Promise<void>;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  findings: INITIAL_DEMO_FINDINGS,
  selectedFindingId: INITIAL_DEMO_FINDINGS[0]?.id || null,
  activeFilter: 'all',
  isAuditing: false,
  activeTab: 'remediation',
  auditMode: 'deep_agentic_rag',
  telemetry: null,
  activeTraceClaimId: null,
  abortController: null,

  setFindings: (findings) =>
    set({ findings, selectedFindingId: findings[0]?.id || null }),
  setSelectedFindingId: (id) => set({ selectedFindingId: id }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setAuditMode: (auditMode) => set({ auditMode }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setActiveTraceClaimId: (activeTraceClaimId) => set({ activeTraceClaimId }),

  cancelActiveAudit: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isAuditing: false, abortController: null });
    if (typeof window !== 'undefined') {
      const { useReciteStore } = require('@/lib/store');
      useReciteStore.getState().setIsAuditing(false);
      useReciteStore.getState().setAuditProgress(null);
      useReciteStore.getState().addToast('Audit cancelled by user', 'info');
    }
  },

  resolveFinding: (id) =>
    set((state) => {
      const nextFindings = state.findings.map((f) =>
        f.id === id ? { ...f, status: 'resolved' as const } : f
      );
      const nextUnresolved = nextFindings.find((f) => f.status === 'unresolved');
      return {
        findings: nextFindings,
        selectedFindingId: nextUnresolved ? nextUnresolved.id : id,
      };
    }),

  dismissFinding: (id) =>
    set((state) => {
      const nextFindings = state.findings.map((f) =>
        f.id === id ? { ...f, status: 'dismissed' as const } : f
      );
      const nextUnresolved = nextFindings.find((f) => f.status === 'unresolved');
      return {
        findings: nextFindings,
        selectedFindingId: nextUnresolved ? nextUnresolved.id : id,
      };
    }),

  restoreFinding: (id) =>
    set((state) => ({
      findings: state.findings.map((f) =>
        f.id === id ? { ...f, status: 'unresolved' as const } : f
      ),
    })),

  copyCitationAndBib: (id, source) => {
    const { LatexSanitizer } = require('@/lib/latex-sanitizer');
    const rawKey = source.bibtexKey ||
      (source.authors?.[0]?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || 'ref') +
      (source.year || '2024');
    const bibKey = rawKey.replace(/[^a-zA-Z0-9_\-:]/g, '');
    const bibEntry = LatexSanitizer.formatSanitizedBibtex({ ...source, bibtexKey: bibKey });
    const clipText = `% In-text LaTeX Citation:\n\\cite{${bibKey}}\n\n% BibTeX Entry:\n${bibEntry}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(clipText).then(() => {
        if (typeof window !== 'undefined') {
          const { useReciteStore } = require('@/lib/store');
          useReciteStore.getState().addToast(`Copied \\cite{${bibKey}} and BibTeX entry to clipboard`, 'success');
        }
      });
    }
  },

  groupFindingsBySection: (texContent: string) => {
    if (!texContent) return;
    const lines = texContent.split('\n');
    const sectionHeaders: { line: number; title: string }[] = [];

    lines.forEach((lineText, idx) => {
      const match = lineText.match(/\\(?:sub)*section\*?\{([^}]+)\}/);
      if (match) {
        sectionHeaders.push({ line: idx + 1, title: match[1].trim() });
      }
    });

    if (sectionHeaders.length === 0) return;

    set((state) => ({
      findings: state.findings.map((f) => {
        const findingLine = f.line || 1;
        let matchedSection = 'Document Preamble / General';
        for (const sec of sectionHeaders) {
          if (findingLine >= sec.line) {
            matchedSection = sec.title;
          } else {
            break;
          }
        }
        return { ...f, sectionTitle: matchedSection };
      }),
    }));
  },

  runAudit: async (forceBypassCache = false) => {
    const controller = new AbortController();
    set({ isAuditing: true, abortController: controller });

    try {
      const { useReciteStore } = await import('@/lib/store');
      const reciteStore = useReciteStore.getState();
      reciteStore.setIsAuditing(true);

      const rawText = reciteStore.rawText;
      const bibtexContent = reciteStore.bibtexContent;
      const workspacePath = reciteStore.workspace.fileName || '';

      const { readAuditCache, writeAuditCache } = await import('@/services/cache-manager');

      // Check cache first if not forced bypass
      if (!forceBypassCache && workspacePath && rawText) {
        reciteStore.setAuditProgress('Checking local .recite/audit-cache.json...');
        const cached = await readAuditCache(workspacePath, rawText);
        if (cached.hit && cached.isFresh && cached.findings.length > 0) {
          set({
            findings: cached.findings,
            selectedFindingId: cached.findings[0]?.id || null,
            isAuditing: false,
            abortController: null,
          });
          get().groupFindingsBySection(rawText);
          reciteStore.setClaims(cached.claims);
          reciteStore.setCacheStatus({ isRestored: true, isFresh: true, timestamp: cached.timestamp });
          reciteStore.setIsAuditing(false);
          reciteStore.setAuditProgress(null);
          reciteStore.addToast(`Audit state restored from cache (${cached.findings.length} findings, 0 API calls).`, 'success');
          return;
        }
      }

      const { ClaimExtractionOrchestrator } = await import('@/services/claim-extraction-orchestrator');
      
      const result = await ClaimExtractionOrchestrator.runFullDiscoveryPipeline(
        rawText || '',
        bibtexContent,
        (msg: string) => reciteStore.setAuditProgress(msg),
        (telemetryUpdate: AgenticPipelineTelemetry) => {
          set({ telemetry: telemetryUpdate });
        },
        controller.signal
      );

      if (controller.signal.aborted) {
        return;
      }

      set({
        findings: result.allFindings,
        selectedFindingId: result.allFindings[0]?.id || null,
        isAuditing: false,
        abortController: null,
      });

      // Group findings by document sections
      get().groupFindingsBySection(rawText || '');

      reciteStore.setClaims(result.reciteClaims);
      reciteStore.setIsAuditing(false);
      reciteStore.setAuditProgress(null);

      // Write cache to disk
      if (workspacePath && rawText) {
        await writeAuditCache(
          workspacePath,
          reciteStore.workspace.activeFilePath || 'main.tex',
          rawText,
          result.allFindings,
          result.reciteClaims
        );
        reciteStore.setCacheStatus({ isRestored: false, isFresh: true, timestamp: new Date().toISOString() });
      }

      reciteStore.addToast(`Deep Agentic RAG audit complete (${result.allFindings.length} findings in ${result.latencyMs}ms)`, 'success');
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        console.log('[useAuditStore] Audit successfully aborted.');
      } else {
        console.error('[useAuditStore] Audit failed:', err);
      }
      set({ isAuditing: false, abortController: null });
      if (typeof window !== 'undefined') {
        const { useReciteStore } = require('@/lib/store');
        useReciteStore.getState().setIsAuditing(false);
      }
    }
  },
}));
