import { Claim } from './store';

export const DEMO_BIBTEX = `@article{shimizu2003,
  title = {Spin Liquid State in an Organic Spin-$1/2$ Triangular Lattice Antiferromagnet $\\kappa$-(BEDT-TTF)$_2$Cu$_2$(CN)$_3$},
  author = {Shimizu, Y. and Miyagawa, K. and Kanoda, K. and Maesato, M. and Saito, G.},
  journal = {Physical Review Letters},
  volume = {91},
  number = {10},
  pages = {107001},
  year = {2003}
}

@article{itoh1998,
  title = {NMR and NQR Studies of Low-Dimensional Spin Liquid and Quantum Frustrated Magnets},
  author = {Itoh, Yutaka and Machi, Takato and Koshizuka, Naoki},
  journal = {Physical Review B},
  volume = {58},
  number = {6},
  pages = {3458--3465},
  year = {1998}
}

@article{imai1993,
  title = {$^{63}\\text{Cu}$ Spin-Lattice Relaxation Rate and Knight Shift in Underdoped Cuprates and Organic Superconductors},
  author = {Imai, Takashi and Slichter, Charles P. and Yoshimura, K. and Kosuge, K.},
  journal = {Physical Review Letters},
  volume = {70},
  number = {7},
  pages = {1002--1005},
  year = {1993}
}

@article{zheng2017,
  title = {Gapless Spin Liquid State in the $S=1/2$ Kagome Antiferromagnet ZnCu$_3$(OH)$_6$Cl$_2$ Observed by $^{17}\\text{O}$ NMR},
  author = {Zheng, G.-Q. and Fukazawa, H. and Kitaoka, Y.},
  journal = {Nature Physics},
  volume = {13},
  pages = {117--121},
  year = {2017}
}

@article{lawson2021,
  title = {Ultra-Low Temperature Cryogenic Dilution Probes for High-Field In Situ Nuclear Magnetic Resonance},
  author = {Lawson, Christopher D. and Harrison, Neil and Rickel, D. G.},
  journal = {Review of Scientific Instruments},
  volume = {92},
  number = {4},
  pages = {043902},
  year = {2021}
}`;

export const DEMO_MANUSCRIPT = `Nuclear Magnetic Resonance and Cryogenic Laser Spectroscopy in the Quantum Spin Liquid Phase of $\\kappa$-(BEDT-TTF)$_2$Cu$_2$(CN)$_3$

1. Introduction and Theoretical Framework

Frustrated quantum magnets with $S = 1/2$ degrees of freedom on triangular lattices provide a benchmark platform for realizing gapless quantum spin liquid (QSL) states \\cite{shimizu2003}. In the presence of strong Heisenberg exchange coupling $J/k_B \\approx 250\\text{ K}$ and modest ring exchange terms, conventional Néel ordering is suppressed down to millikelvin regimes. The isotropic spin Hamiltonian in an external magnetic field $\\mathbf{B}_0 = (0, 0, B_0)$ is defined by:

$$\\mathcal{H} = J \\sum_{\\langle i,j \\rangle} \\mathbf{S}_i \\cdot \\mathbf{S}_j + J_{\\text{ring}} \\sum_{\\langle i,j,k,l \\rangle} \\left[ (\\mathbf{S}_i \\cdot \\mathbf{S}_j)(\\mathbf{S}_k \\cdot \\mathbf{S}_l) + (\\mathbf{S}_i \\cdot \\mathbf{S}_l)(\\mathbf{S}_j \\cdot \\mathbf{S}_k) - (\\mathbf{S}_i \\cdot \\mathbf{S}_k)(\\mathbf{S}_j \\cdot \\mathbf{S}_l) \\right] + g\\mu_B B_0 \\sum_i S_i^z$$

where $\\mathbf{S}_i$ denotes the quantum spin-1/2 operator at lattice site $i$, $g \\approx 2.00$ is the effective gyromagnetic factor, and $\\mu_B$ is the Bohr magneton.

2. Cryogenic Probe Design and RF Instrumentation

To resolve the hyperfine coupling between nuclear spins and fractionalized spinon excitations, we developed an ultra-compact $^{3}\\text{He}\\text{-}^{4}\\text{He}$ dilution refrigerator probe operating at a base temperature of $T_{\\text{base}} = 28\\text{ mK}$ inside a 16.5 Tesla superconducting magnet \\cite{lawson2021}. The nuclear spin-lattice relaxation rate $T_1^{-1}$ was acquired via saturation-recovery pulse sequences ($(\\pi/2) - t - (\\pi/2) - \\pi$). RF phase coherence was sustained by a custom double-shielded semi-rigid coaxial transmission line designed to maintain insertion loss below $0.45\\text{ dB/m}$ at $180\\text{ MHz}$ \\cite{zheng2024_unresolved}.

3. Knight Shift Tensor and Low-Frequency Spin Susceptibility

The total local field experienced by $^{13}\\text{C}$ and $^{63}\\text{Cu}$ nuclei is parameterized through the magnetic hyperfine tensor $\\mathbf{A}_{hf}$ and the static Knight shift tensor $\\mathbf{K}$:

$$\\mathbf{K}(T) = \\mathbf{K}_{orb} + \\frac{\\mathbf{A}_{hf}}{g\\mu_B N_A} \\chi_{spin}(T)$$

$$\\left( \\begin{array}{ccc} K_{xx} & 0 & 0 \\\\ 0 & K_{yy} & 0 \\\\ 0 & 0 & K_{zz} \\end{array} \\right) = \\mathbf{K}_{orb} + \\frac{1}{g\\mu_B N_A} \\left( \\begin{array}{ccc} A_{aa} & 0 & 0 \\\\ 0 & A_{bb} & 0 \\\\ 0 & 0 & A_{cc} \\end{array} \\right) \\chi_{spin}(T)$$

Here $\\mathbf{K}_{orb}$ represents the temperature-independent orbital chemical shift and $\\chi_{spin}(T)$ is the intrinsic spin susceptibility of the 2D triangular layers \\cite{imai1993}. Our high-resolution spectra reveal that $\\mathbf{K}(T)$ remains finite as $T \\to 0\\text{ K}$, directly verifying gapless fermionic spinon excitations with a constant density of states at the Fermi level \\cite{itoh1998}.

4. Spin-Lattice Relaxation Scaling and Anharmonic Dissipation

In the low-temperature asymptotic regime $T < 1.2\\text{ K}$, the Korringa-like relaxation rate follows a power-law dependency:

$$T_1^{-1}(T) = \\gamma_n^2 k_B T \\lim_{\\omega \\to 0} \\sum_{\\mathbf{q}} |A_{hf}(\\mathbf{q})|^2 \\frac{\\text{Im}\\,\\chi_{\\perp}(\\mathbf{q},\\omega)}{\\hbar\\omega} \\propto T^{\\eta}$$

where $\\eta = 1.02 \\pm 0.04$, matching the predicted scaling for a $U(1)$ gauge-field coupled spinon Fermi surface \\cite{zheng2017}. High-field continuous-wave optical spectroscopy confirms the absence of single-particle gap openings or structural dimerization down to $45\\text{ mK}$.`;

export const DEMO_CLAIMS: Claim[] = [
  {
    id: 'claim-1',
    text: 'Frustrated quantum magnets with $S = 1/2$ degrees of freedom on triangular lattices provide a benchmark platform for realizing gapless quantum spin liquid (QSL) states \\cite{shimizu2003}.',
    category: 'Literature Claim',
    streamType: 'discovery',
    severity: 'Low',
    status: 'accepted',
    lineIndex: 2,
    startIndex: 153,
    endIndex: 326,
    citationKey: 'shimizu2003',
    context: 'Frustrated quantum magnets with $S = 1/2$ degrees of freedom on triangular lattices provide a benchmark platform for realizing gapless quantum spin liquid (QSL) states \\cite{shimizu2003}. In the presence of strong Heisenberg exchange coupling $J/k_B \\approx 250\\text{ K}$ and modest ring exchange terms, conventional Néel ordering is suppressed down to millikelvin regimes.',
    auditType: 'Unsupported Assertion',
    suggestedPapers: [
      {
        paperId: 's2-shimizu',
        title: 'Spin Liquid State in an Organic Spin-1/2 Triangular Lattice Antiferromagnet κ-(BEDT-TTF)2Cu2(CN)3',
        year: 2003,
        authors: ['Y. Shimizu', 'K. Miyagawa', 'K. Kanoda', 'M. Maesato', 'G. Saito'],
        venue: 'Physical Review Letters (PRL)',
        doi: '10.1103/PhysRevLett.91.107001',
        bibtexKey: 'shimizu2003',
        matchScore: 98,
        abstractExcerpt: 'We report 13C NMR and optical spectroscopy measurements of the organic triangular lattice compound showing no indication of magnetic ordering or gap opening down to 32 mK.',
        verificationStatus: 'verified',
        citationCount: 1420,
        influentialCitationCount: 290,
      },
    ],
  },
  {
    id: 'claim-2',
    text: 'RF phase coherence was sustained by a custom double-shielded semi-rigid coaxial transmission line designed to maintain insertion loss below $0.45\\text{ dB/m}$ at $180\\text{ MHz}$ \\cite{zheng2024_unresolved}.',
    category: 'Instrumentation/Methodology',
    streamType: 'integrity',
    severity: 'Critical',
    status: 'pending',
    lineIndex: 12,
    startIndex: 1086,
    endIndex: 1285,
    citationKey: 'zheng2024_unresolved',
    context: 'The nuclear spin-lattice relaxation rate $T_1^{-1}$ was acquired via saturation-recovery pulse sequences ($(\\pi/2) - t - (\\pi/2) - \\pi$). RF phase coherence was sustained by a custom double-shielded semi-rigid coaxial transmission line designed to maintain insertion loss below $0.45\\text{ dB/m}$ at $180\\text{ MHz}$ \\cite{zheng2024_unresolved}.',
    suggestedFix: 'RF phase coherence was sustained by a custom double-shielded semi-rigid coaxial transmission line designed to maintain insertion loss below $0.45\\text{ dB/m}$ at $180\\text{ MHz}$ \\cite{lawson2021}.',
    auditType: 'MissingCitation',
    suggestedPapers: [
      {
        paperId: 's2-lawson21',
        title: 'Ultra-Low Temperature Cryogenic Dilution Probes for High-Field In Situ Nuclear Magnetic Resonance',
        year: 2021,
        authors: ['Christopher D. Lawson', 'Neil Harrison', 'D. G. Rickel'],
        venue: 'Review of Scientific Instruments',
        doi: '10.1063/5.0046201',
        bibtexKey: 'lawson2021',
        matchScore: 94,
        abstractExcerpt: 'Design and RF insertion loss characterization of low-loss coaxial transmission lines down to 20 mK in high magnetic fields.',
        verificationStatus: 'verified',
        citationCount: 42,
        influentialCitationCount: 8,
      },
    ],
  },
  {
    id: 'claim-3',
    text: 'Our high-resolution spectra reveal that $\\mathbf{K}(T)$ remains finite as $T \\to 0\\text{ K}$, directly verifying gapless fermionic spinon excitations with a constant density of states at the Fermi level \\cite{itoh1998}.',
    category: 'Theoretical Assertion',
    streamType: 'discovery',
    severity: 'High',
    status: 'pending',
    lineIndex: 22,
    startIndex: 1810,
    endIndex: 2035,
    citationKey: 'itoh1998',
    context: 'Here $\\mathbf{K}_{orb}$ represents the temperature-independent orbital chemical shift and $\\chi_{spin}(T)$ is the intrinsic spin susceptibility of the 2D triangular layers \\cite{imai1993}. Our high-resolution spectra reveal that $\\mathbf{K}(T)$ remains finite as $T \\to 0\\text{ K}$, directly verifying gapless fermionic spinon excitations with a constant density of states at the Fermi level \\cite{itoh1998}.',
    suggestedFix: 'Our high-resolution spectra reveal that $\\mathbf{K}(T)$ remains finite as $T \\to 0\\text{ K}$, directly verifying gapless fermionic spinon excitations with a constant density of states at the Fermi level \\cite{itoh1998,imai1993}.',
    auditType: 'Weak Attribution',
    suggestedPapers: [
      {
        paperId: 's2-itoh',
        title: 'NMR and NQR Studies of Low-Dimensional Spin Liquid and Quantum Frustrated Magnets',
        year: 1998,
        authors: ['Yutaka Itoh', 'Takato Machi', 'Naoki Koshizuka'],
        venue: 'Physical Review B (PRB)',
        doi: '10.1103/PhysRevB.58.3458',
        bibtexKey: 'itoh1998',
        matchScore: 91,
        abstractExcerpt: 'Nuclear magnetic resonance investigations into spin susceptibility scaling and gapless excitations in low-dimensional frustrated triangular antiferromagnets.',
        verificationStatus: 'verified',
        citationCount: 312,
        influentialCitationCount: 45,
      },
      {
        paperId: 's2-imai',
        title: '63Cu Spin-Lattice Relaxation Rate and Knight Shift in Underdoped Cuprates and Organic Superconductors',
        year: 1993,
        authors: ['Takashi Imai', 'Charles P. Slichter', 'K. Yoshimura', 'K. Kosuge'],
        venue: 'Physical Review Letters (PRL)',
        doi: '10.1103/PhysRevLett.70.1002',
        bibtexKey: 'imai1993',
        matchScore: 89,
        abstractExcerpt: 'Direct experimental observation of finite low-frequency spin susceptibility and Korringa scaling indicative of Fermi surface spinon excitations.',
        verificationStatus: 'verified',
        citationCount: 520,
        influentialCitationCount: 78,
      },
    ],
  },
  {
    id: 'claim-4',
    text: 'matching the predicted scaling for a $U(1)$ gauge-field coupled spinon Fermi surface \\cite{zheng2017}.',
    category: 'Literature Claim',
    streamType: 'integrity',
    severity: 'Medium',
    status: 'pending',
    lineIndex: 28,
    startIndex: 2282,
    endIndex: 2384,
    citationKey: 'zheng2017',
    context: 'In the low-temperature asymptotic regime $T < 1.2\\text{ K}$, the Korringa-like relaxation rate follows a power-law dependency: where $\\eta = 1.02 \\pm 0.04$, matching the predicted scaling for a $U(1)$ gauge-field coupled spinon Fermi surface \\cite{zheng2017}.',
    suggestedFix: 'matching the predicted scaling for a $U(1)$ gauge-field coupled spinon Fermi surface \\cite{zheng2017,shimizu2003}.',
    auditType: 'WeakCitation',
    suggestedPapers: [
      {
        paperId: 's2-zheng17',
        title: 'Gapless Spin Liquid State in the S=1/2 Kagome Antiferromagnet ZnCu3(OH)6Cl2 Observed by 17O NMR',
        year: 2017,
        authors: ['G.-Q. Zheng', 'H. Fukazawa', 'Y. Kitaoka'],
        venue: 'Nature Physics',
        doi: '10.1038/nphys3897',
        bibtexKey: 'zheng2017',
        matchScore: 93,
        abstractExcerpt: 'Nuclear magnetic resonance observation of gapless quantum spin liquid ground state with linear susceptibility scaling.',
        verificationStatus: 'verified',
        citationCount: 418,
        influentialCitationCount: 88,
      },
    ],
  },
  {
    id: 'claim-5',
    text: 'High-field continuous-wave optical spectroscopy confirms the absence of single-particle gap openings or structural dimerization down to $45\\text{ mK}$.',
    category: 'Numerical/Data Claim',
    streamType: 'discovery',
    severity: 'High',
    status: 'pending',
    lineIndex: 30,
    startIndex: 2386,
    endIndex: 2530,
    context: 'High-field continuous-wave optical spectroscopy confirms the absence of single-particle gap openings or structural dimerization down to $45\\text{ mK}$.',
    suggestedFix: 'High-field continuous-wave optical spectroscopy confirms the absence of single-particle gap openings or structural dimerization down to $45\\text{ mK}$ \\cite{shimizu2003}.',
    auditType: 'Empirical Gap',
    suggestedPapers: [
      {
        paperId: 's2-shimizu-opt',
        title: 'Optical and Thermodynamic Exploration of Low-Energy Excitations in Organic Quantum Spin Liquids',
        year: 2006,
        authors: ['K. Kanoda', 'Y. Shimizu', 'M. Maesato'],
        venue: 'Journal of the Physical Society of Japan',
        doi: '10.1143/JPSJ.75.074707',
        bibtexKey: 'kanoda2006',
        matchScore: 95,
        abstractExcerpt: 'Continuous optical absorption measurements down to 40 mK establishing the absence of localized charge gaps or lattice dimerization.',
        verificationStatus: 'verified',
        citationCount: 185,
        influentialCitationCount: 32,
      },
    ],
  },
];