import { Claim, SuggestedPaper } from './store';

export const DEMO_MANUSCRIPT = `Quantum Spin Dynamics in Low-Dimensional Magnetically Frustrated Systems

Recent advancements in continuous-wave laser spectroscopy have improved spatial resolution, enabling deeper focal penetration into crystalline samples. However, the custom cryogenic probe utilized in our setup operates at 4K, presenting unique challenges for signal acquisition.

The Hamiltonian governing the spin interactions in our triangular lattice antiferromagnet can be expressed as:

$$\\mathcal{H} = -J \\sum_{\\langle i,j \\rangle} \\mathbf{S}_i \\cdot \\mathbf{S}_j - D \\sum_i (S_i^z)^2 + g\\mu_B B \\sum_i S_i^z$$

where $J$ represents the nearest-neighbor exchange coupling, $D$ is the single-ion anisotropy constant, and $B$ denotes the applied magnetic field. The Knight shift calculations indicate a significant deviation from the expected linear response regime at fields exceeding 8 Tesla.

Our experimental methodology employs a novel dual-channel lock-in detection scheme that suppresses common-mode noise by approximately 40 dB. The sample preparation protocol involves chemical vapor transport growth in a sealed quartz ampoule maintained at 1100°C for 72 hours.

The temperature-dependent susceptibility follows a modified Curie-Weiss law:

$$\\chi(T) = \\frac{C}{T - \\theta_{CW}} + \\chi_0 + \\alpha T^{3/2}$$

where \\chi_0 represents the temperature-independent Van Vleck contribution and the T^{3/2} term accounts for spin-wave excitations in the low-temperature limit.

Preliminary results suggest the existence of a quantum spin liquid phase below 0.5K, characterized by a T^2 dependence of the specific heat and the absence of long-range magnetic ordering down to the lowest accessible temperatures. The anomalous Hall conductivity measurements reveal a topological contribution that persists well into the paramagnetic regime.

The Raman scattering spectra exhibit a broad continuum centered around 1200 cm^{-1}, consistent with fractionalized spinon excitations predicted by theoretical models of the kagome lattice Heisenberg antiferromagnet. Our neutron diffraction data collected at the HFIR facility show no evidence of magnetic Bragg peaks, further supporting the spin liquid hypothesis.

Future work will focus on extending these measurements to pressures up to 15 GPa using diamond anvil cell techniques, as recent high-pressure studies on related compounds have revealed pressure-induced magnetic transitions that may provide insight into the nature of the ground state degeneracy.`;

export const DEMO_CLAIMS: Claim[] = [
  {
    id: 'claim-1',
    text: 'Recent advancements in continuous-wave laser spectroscopy have improved spatial resolution, enabling deeper focal penetration into crystalline samples.',
    category: 'Literature Claim',
    severity: 'High',
    status: 'pending',
    lineIndex: 2,
    startIndex: 0,
    endIndex: 151,
    suggestedPapers: [
      {
        paperId: 's2-001',
        title: 'High-Resolution Continuous-Wave Laser Spectroscopy in Solid-State Quantum Systems',
        year: 2022,
        authors: ['A. R. Miller', 'H. Zhang', 'E. V. Kowalski'],
        doi: '10.1103/PhysRevB.105.125102',
        citationCount: 142,
        influentialCitationCount: 18,
        url: 'https://doi.org/10.1103/PhysRevB.105.125102',
      },
      {
        paperId: 's2-002',
        title: 'Focal depth optimization in sub-micron optical spectroscopy',
        year: 2020,
        authors: ['S. Tanaka', 'M. L. Chen'],
        doi: '10.1038/s41567-020-0891-x',
        citationCount: 89,
        influentialCitationCount: 7,
        url: 'https://doi.org/10.1038/s41567-020-0891-x',
      },
    ],
  },
  {
    id: 'claim-2',
    text: 'The Knight shift calculations indicate a significant deviation from the expected linear response regime at fields exceeding 8 Tesla.',
    category: 'Theoretical Assertion',
    severity: 'High',
    status: 'pending',
    lineIndex: 8,
    startIndex: 135,
    endIndex: 288,
    suggestedPapers: [
      {
        paperId: 's2-003',
        title: 'Nonlinear Knight shift response and spin-tensor anisotropy in high magnetic fields',
        year: 2021,
        authors: ['J. S. NMR Group', 'P. Rai', 'R. S. Gupta'],
        doi: '10.1103/PhysRevLett.126.047201',
        citationCount: 67,
        influentialCitationCount: 12,
        url: 'https://doi.org/10.1103/PhysRevLett.126.047201',
      },
    ],
  },
  {
    id: 'claim-3',
    text: 'Our experimental methodology employs a novel dual-channel lock-in detection scheme that suppresses common-mode noise by approximately 40 dB.',
    category: 'Instrumentation/Methodology',
    severity: 'Medium',
    status: 'pending',
    lineIndex: 10,
    startIndex: 0,
    endIndex: 147,
    suggestedPapers: [
      {
        paperId: 's2-004',
        title: 'Dual-channel phase-sensitive detection for cryogenic instrumentation',
        year: 2019,
        authors: ['D. K. Pratt', 'L. F. Johnson'],
        doi: '10.1063/1.5098231',
        citationCount: 34,
        influentialCitationCount: 3,
        url: 'https://doi.org/10.1063/1.5098231',
      },
    ],
  },
  {
    id: 'claim-4',
    text: 'consistent with fractionalized spinon excitations predicted by theoretical models of the kagome lattice Heisenberg antiferromagnet.',
    category: 'Literature Claim',
    severity: 'High',
    status: 'pending',
    lineIndex: 18,
    startIndex: 64,
    endIndex: 188,
    suggestedPapers: [
      {
        paperId: 's2-005',
        title: 'Fractionalized excitations in a kagome Heisenberg antiferromagnet',
        year: 2012,
        authors: ['T. H. Han', 'J. S. Helton', 'S. Chu', 'D. G. Nocera'],
        doi: '10.1038/nature11659',
        citationCount: 812,
        influentialCitationCount: 145,
        url: 'https://doi.org/10.1038/nature11659',
      },
      {
        paperId: 's2-006',
        title: 'Quantum spin liquids: a review',
        year: 2010,
        authors: ['L. Balents'],
        doi: '10.1038/nature08917',
        citationCount: 2450,
        influentialCitationCount: 420,
        url: 'https://doi.org/10.1038/nature08917',
      },
    ],
  },
  {
    id: 'claim-5',
    text: 'as recent high-pressure studies on related compounds have revealed pressure-induced magnetic transitions that may provide insight into the nature of the ground state degeneracy.',
    category: 'Literature Claim',
    severity: 'Medium',
    status: 'pending',
    lineIndex: 20,
    startIndex: 108,
    endIndex: 288,
    suggestedPapers: [
      {
        paperId: 's2-007',
        title: 'Pressure-induced quantum phase transitions in frustrated quantum magnets',
        year: 2023,
        authors: ['Y. Shimizu', 'K. Miyagawa', 'K. Kanoda'],
        doi: '10.1103/RevModPhys.95.025001',
        citationCount: 95,
        influentialCitationCount: 16,
        url: 'https://doi.org/10.1103/RevModPhys.95.025001',
      },
    ],
  },
];