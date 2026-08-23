import { create } from 'zustand';
import { AuditFinding, FindingCategory } from '@/types/audit';

export const INITIAL_DEMO_FINDINGS: AuditFinding[] = [
  {
    id: 'finding-1',
    line: 64,
    category: 'bib_mismatch',
    severity: 'medium',
    type: 'Missing BibTeX Key',
    citationKey: 'zheng2024_unresolved',
    context: 'RF phase coherence was sustained by a custom double-shielded semi-rigid coaxial transmission line designed to maintain insertion loss below 0.45 dB/m at 180 MHz \\cite{zheng2024_unresolved}.',
    suggestedPatch: {
      diffRemove: '\\cite{zheng2024_unresolved}',
      diffAdd: '\\cite{zheng2017}',
    },
    verifiedSources: [],
    status: 'unresolved',
  },
  {
    id: 'finding-2',
    line: 82,
    category: 'literature_discovery',
    severity: 'medium',
    type: 'Unsupported Claim',
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
        doi: '10.1103/PhysRevLett.91.107001',
        bibtexKey: 'shimizu2003',
        relevanceScore: 0.96,
        abstractSnippet: 'We report 13C NMR and optical spectroscopy measurements of the organic triangular lattice compound showing no indication of magnetic ordering or gap opening down to 32 mK.',
        verificationStatus: 'verified',
      },
      {
        title: 'NMR and NQR Studies of Low-Dimensional Spin Liquid and Quantum Frustrated Magnets',
        authors: ['Itoh, Yutaka', 'Machi, Takato', 'Koshizuka, Naoki'],
        year: 1998,
        doi: '10.1103/PhysRevB.58.3458',
        bibtexKey: 'itoh1998',
        relevanceScore: 0.88,
        abstractSnippet: 'Nuclear magnetic resonance investigations into spin susceptibility scaling and gapless excitations in low-dimensional frustrated triangular antiferromagnets.',
        verificationStatus: 'verified',
      },
    ],
    status: 'unresolved',
  },
  {
    id: 'finding-3',
    line: 74,
    category: 'literature_discovery',
    severity: 'critical',
    type: 'Unverified Physical Claim',
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
        doi: '10.1103/PhysRevLett.70.1002',
        bibtexKey: 'imai1993',
        relevanceScore: 0.92,
        abstractSnippet: 'Direct experimental observation of finite low-frequency spin susceptibility and Korringa scaling indicative of Fermi surface spinon excitations.',
        verificationStatus: 'verified',
      },
    ],
    status: 'unresolved',
  },
  {
    id: 'finding-4',
    line: 56,
    category: 'bib_mismatch',
    severity: 'low',
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

interface AuditState {
  findings: AuditFinding[];
  selectedFindingId: string | null;
  activeFilter: 'all' | FindingCategory;
  isAuditing: boolean;
  activeTab: 'remediation' | 'sources' | 'integrity' | 'zotero';
  setFindings: (findings: AuditFinding[]) => void;
  setSelectedFindingId: (id: string | null) => void;
  setActiveFilter: (filter: 'all' | FindingCategory) => void;
  setActiveTab: (tab: 'remediation' | 'sources' | 'integrity' | 'zotero') => void;
  resolveFinding: (id: string) => void;
  runAudit: () => Promise<void>;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  findings: INITIAL_DEMO_FINDINGS,
  selectedFindingId: INITIAL_DEMO_FINDINGS[0]?.id || null,
  activeFilter: 'all',
  isAuditing: false,
  activeTab: 'remediation',
  setFindings: (findings) =>
    set({ findings, selectedFindingId: findings[0]?.id || null }),
  setSelectedFindingId: (id) => set({ selectedFindingId: id }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setActiveTab: (activeTab) => set({ activeTab }),
  resolveFinding: (id) =>
    set((state) => ({
      findings: state.findings.map((f) =>
        f.id === id ? { ...f, status: 'resolved' } : f
      ),
    })),
  runAudit: async () => {
    set({ isAuditing: true });
    // Simulate high-performance AST scan & literature reconciliation
    await new Promise((r) => setTimeout(r, 600));
    set({
      findings: INITIAL_DEMO_FINDINGS.map((f) => ({ ...f, status: 'unresolved' })),
      selectedFindingId: INITIAL_DEMO_FINDINGS[0]?.id || null,
      isAuditing: false,
    });
  },
}));
