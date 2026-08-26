import fs from 'fs';
import path from 'path';

const BENCHMARK_DIR = path.resolve(__dirname, '../.benchmark-payload');
const CHAPTERS_DIR = path.join(BENCHMARK_DIR, 'chapters');

const EMPIRICAL_CLAIMS = [
  'High-field continuous-wave optical spectroscopy confirms the absence of single-particle gap openings down to 45 mK.',
  'Our high-resolution spectra reveal that K(T) remains finite as T -> 0 K, directly verifying gapless fermionic spinon excitations with constant density of states.',
  'Thermal conductivity measurements demonstrate linear temperature dependence kappa/T indicative of itinerant fermionic quasiparticles.',
  'Nuclear magnetic resonance relaxation rate 1/T1 scales with T^3, consistent with gapless Dirac spin liquid excitations.',
  'Angle-resolved photoemission spectroscopy reveals renormalized Fermi velocity of 2.4 x 10^5 m/s at 100 mK.',
];

function generateMathBlock(): string {
  return `\\begin{align*}\n  E &= mc^2 \\\\\n  \\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0}\n\\end{align*}\n`;
}

function generateProseBlock(chapterIndex: number, lineIndex: number): string {
  if (lineIndex % 50 === 0) {
    const claim = EMPIRICAL_CLAIMS[(chapterIndex + lineIndex / 50) % EMPIRICAL_CLAIMS.length];
    return `In Sector ${chapterIndex} analysis, we observe that ${claim} This provides foundational benchmark constraints.\n`;
  }
  return `This is line ${lineIndex} of chapter ${chapterIndex}. We demonstrate the scalability of the parser by citing a complex finding \\cite{ref${chapterIndex}_${lineIndex}}.\n`;
}

function generateChapter(chapterIndex: number): string {
  let content = `\\chapter{Analysis of Sector ${chapterIndex}}\n\n`;

  for (let i = 0; i < 500; i++) {
    content += generateProseBlock(chapterIndex, i);
    
    // Inject 50 math blocks evenly distributed
    if (i > 0 && i % 10 === 0 && (i / 10) <= 50) {
      content += generateMathBlock();
    }
  }

  // Inject circular dependency in specific chapters (for fuzz test verification)
  if ([2, 4, 8, 12, 16].includes(chapterIndex)) {
    content += `\n% Intentional Circular Dependency Injection for Fuzzing\n\\input{../main.tex}\n`;
  }

  return content;
}

function generateMainTex(): string {
  let content = `\\documentclass{report}\n\\begin{document}\n\n`;
  
  for (let i = 1; i <= 20; i++) {
    content += `\\include{chapters/chapter${i}.tex}\n`;
  }
  
  content += `\\end{document}\n`;
  return content;
}

function generateBibtex(): string {
  return `@article{shimizu2003,
  title = {Spin Liquid State in an Organic Spin-1/2 Triangular Lattice Antiferromagnet},
  author = {Shimizu, Y. and Miyagawa, K. and Kanoda, K.},
  journal = {Physical Review Letters},
  year = {2003},
  doi = {10.1103/PhysRevLett.91.107001}
}

@article{itoh1998,
  title = {NMR and NQR Studies of Low-Dimensional Spin Liquid and Quantum Frustrated Magnets},
  author = {Itoh, Yutaka and Machi, Takato},
  journal = {Physical Review B},
  year = {1998},
  doi = {10.1103/PhysRevB.58.3458}
}
`;
}

async function main() {
  console.log('[Stress Generator] Generating synthetic benchmark payload...');
  
  if (!fs.existsSync(CHAPTERS_DIR)) {
    fs.mkdirSync(CHAPTERS_DIR, { recursive: true });
  }

  for (let i = 1; i <= 20; i++) {
    const chapContent = generateChapter(i);
    fs.writeFileSync(path.join(CHAPTERS_DIR, `chapter${i}.tex`), chapContent, 'utf-8');
  }


  fs.writeFileSync(path.join(BENCHMARK_DIR, 'main.tex'), generateMainTex(), 'utf-8');
  fs.writeFileSync(path.join(BENCHMARK_DIR, 'thesis.bib'), generateBibtex(), 'utf-8');

  console.log(`[Stress Generator] Successfully generated 1 main.tex, thesis.bib, and 20 chapter files in ${BENCHMARK_DIR}`);
}

main().catch(console.error);
