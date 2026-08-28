import { describe, it, expect } from 'vitest';
import { parseMathBlocks } from '../src/lib/parsers/math-parser';
import { rehydrateQuarantinedMath, LaTeXParser } from '../src/services/latex-parser';
import { flattenLatexTree, stripLatexComments, buildArxivBundle } from '../src/services/arxiv-bundler';
import { generateComplianceDossier } from '../src/services/compliance-dossier';
import { ProviderRateLimiter } from '../src/services/rate-limiter';
import JSZip from 'jszip';

// ─────────────────────────────────────────────────────────────────────────────
// § 1. SYNTHETIC 10,000-LINE MANUSCRIPT GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

function generateSyntheticManuscript(targetLines = 10000): {
  manuscript: string;
  expectedMathCount: number;
  expectedCitations: string[];
} {
  const lines: string[] = [];
  let mathCount = 0;
  const citations: string[] = [];

  lines.push('\\documentclass[11pt,twocolumn]{article}');
  lines.push('\\usepackage{amsmath,amssymb,graphicx,hyperref}');
  lines.push('\\title{High-Throughput Verification of Quantum Transport Dynamics}');
  lines.push('\\author{ReciteAI Benchmark Consortium}');
  lines.push('\\begin{document}');
  lines.push('\\maketitle');
  lines.push('\\section{Introduction}');

  const mathTemplates = [
    (i: number) => {
      mathCount++;
      return `The fundamental Hamiltonian is given by $H_${i} = \\hbar \\omega_${i} \\left( a^\\dagger a + \\frac{1}{2} \\right)$.`;
    },
    (i: number) => {
      mathCount++;
      return `\\begin{equation}\n  \\Psi_${i}(x, t) = A e^{i(k_${i}x - \\omega_${i} t)} + \\int_0^\\infty \\phi(\\kappa) d\\kappa\n\\end{equation}`;
    },
    (i: number) => {
      mathCount++;
      return `We observe the scalar potential \\[ V_${i}(r) = -\\frac{G M m}{r^2} + \\Lambda r^2 \\] in vacuum.`;
    },
    (i: number) => {
      mathCount++;
      return `Using the dual variable \\( \\xi_${i} = \\sum_{j=1}^n \\alpha_{ij} x_j \\), we derive the canonical form.`;
    },
    (i: number) => {
      mathCount++;
      return `\\begin{align*}\n  \\nabla \\times \\mathbf{B}_${i} &= \\mu_0 \\mathbf{J}_${i} + \\mu_0 \\epsilon_0 \\frac{\\partial \\mathbf{E}_${i}}{\\partial t} \\\\\n  \\nabla \\cdot \\mathbf{E}_${i} &= \\frac{\\rho_${i}}{\\epsilon_0}\n\\end{align*}`;
    },
    (i: number) => {
      mathCount++;
      return `$$ \\sigma_${i}^2 = \\frac{1}{N-1} \\sum_{k=1}^N (X_k - \\bar{X})^2 $$`;
    }
  ];

  let currentLine = lines.length;
  let iteration = 0;

  while (currentLine < targetLines - 10) {
    iteration++;
    const templateIdx = iteration % mathTemplates.length;
    const mathSnippet = mathTemplates[templateIdx](iteration);

    // Text with citation and comments
    const citeKey = `author${iteration % 50}_${2010 + (iteration % 15)}`;
    citations.push(citeKey);

    lines.push(`In paragraph ${iteration}, the quantum dissipation parameter was measured with 99.45\\% confidence.`);
    lines.push(mathSnippet);
    lines.push(`This behavior aligns precisely with earlier measurements by \\cite{${citeKey}} and corroborated in \\url{https://doi.org/10.1038/s41586-021-03${iteration % 900}%20protocol}.`);
    lines.push(`% Internal note ${iteration}: Validate with laboratory baseline before final submission.`);
    lines.push(`\\includegraphics[width=0.48\\textwidth]{figures/plot_${iteration % 10}.png}`);

    if (iteration % 20 === 0) {
      lines.push(`\\input{sections/sub_analysis_${iteration / 20}.tex}`);
    }

    currentLine = lines.length;
  }

  lines.push('\\section{Conclusion}');
  lines.push('The observed coherence parameters remain fully consistent across all experimental runs.');
  lines.push('\\bibliographystyle{plain}');
  lines.push('\\bibliography{references}');
  lines.push('\\end{document}');

  return {
    manuscript: lines.join('\n'),
    expectedMathCount: mathCount,
    expectedCitations: citations
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// § 2. TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────

describe('Sprint 4: 10,000-Line Fuzz & Hardening Suite', () => {
  const { manuscript, expectedMathCount, expectedCitations } = generateSyntheticManuscript(10000);

  it('1. High-load AST Math Quarantining & Rehydration Fidelity', () => {
    const lineCount = manuscript.split('\n').length;
    expect(lineCount).toBeGreaterThanOrEqual(10000);

    const startTime = performance.now();
    const { text: quarantined, mathBlocks } = parseMathBlocks(manuscript);
    const duration = performance.now() - startTime;

    expect(mathBlocks.size).toBe(expectedMathCount);
    expect(quarantined).not.toContain('\\begin{equation}');
    expect(duration).toBeLessThan(5000); // 10k lines parsed in < 5 seconds

    // Rehydrate math
    const tokenMap = new Map<string, string>();
    mathBlocks.forEach((block, key) => tokenMap.set(key, block.content));
    const rehydrated = rehydrateQuarantinedMath(quarantined, tokenMap);

    // Exact character-for-character reconstruction
    expect(rehydrated).toBe(manuscript);
  });

  it('2. Mathematical Coordinate Integrity & Zero-Drift Tracking', () => {
    const { mathBlocks } = parseMathBlocks(manuscript);

    let verifiedBlocks = 0;
    for (const block of mathBlocks.values()) {
      expect(block.originalCoordinates).toBeDefined();
      const { startOffset, endOffset } = block.originalCoordinates!;
      
      expect(startOffset).toBeGreaterThanOrEqual(0);
      expect(endOffset).toBeLessThanOrEqual(manuscript.length);
      expect(startOffset).toBeLessThan(endOffset);

      // Verify that the slice in the original source matches the raw formula block verbatim
      const sourceSlice = manuscript.slice(startOffset, endOffset);
      expect(sourceSlice).toBe(block.content);
      verifiedBlocks++;
    }

    expect(verifiedBlocks).toBe(expectedMathCount);
  });

  it('3. LaTeX Comment Stripping Safety under Extreme Fuzzing', () => {
    const sample = `
      \\begin{document}
      Normal text % this is a comment
      Percentage: 45\\% yield and 100\\% pure.
      URL: \\url{https://arxiv.org/abs/2103.14030%20test}
      % Fully commented line
      Math: $x + y = 1$ % math trailing comment
      \\end{document}
    `;

    const sanitized = stripLatexComments(sample);

    expect(sanitized).not.toContain('this is a comment');
    expect(sanitized).not.toContain('Fully commented line');
    expect(sanitized).not.toContain('math trailing comment');
    expect(sanitized).toContain('45\\% yield');
    expect(sanitized).toContain('100\\% pure.');
    expect(sanitized).toContain('https://arxiv.org/abs/2103.14030%20test');
  });

  it('4. Multi-File Flattener Cycle Detection & Path Normalization', () => {
    const fileMap = new Map<string, string>();
    fileMap.set('main.tex', 'Root text. \\input{sections/intro.tex} \\include{sections\\appendix}');
    fileMap.set('sections/intro.tex', 'Intro text. \\input{sections/methods.tex}');
    fileMap.set('sections/methods.tex', 'Method text. \\input{main.tex}'); // Circular link back to root
    fileMap.set('sections/appendix.tex', 'Appendix content.');

    const flattened = flattenLatexTree(fileMap.get('main.tex')!, fileMap, 'main.tex');

    expect(flattened).toContain('Root text.');
    expect(flattened).toContain('Intro text.');
    expect(flattened).toContain('Method text.');
    expect(flattened).toContain('Appendix content.');
    // Check circular reference was intercepted safely
    expect(flattened).toContain('% [CIRCULAR REFERENCE REMOVED: main.tex]');
  });

  it('5. Clean ArXiv Bundler In-Memory Packaging', async () => {
    const projectFiles: Record<string, any> = {
      'figures/plot_0.png': { text: 'FAKE_PNG_BINARY_DATA_0' },
      'figures/plot_1.png': { text: 'FAKE_PNG_BINARY_DATA_1' },
      'sections/sub_analysis_1.tex': { text: 'Sub analysis section content with $E=mc^2$.' }
    };

    const miniDoc = `
      \\documentclass{article}
      \\begin{document}
      \\input{sections/sub_analysis_1.tex}
      \\includegraphics{figures/plot_0.png}
      \\includegraphics{figures/plot_1}
      \\cite{einstein1905}
      \\end{document}
    `;

    const zipBlob = await buildArxivBundle({
      mainTexContent: miniDoc,
      projectFiles,
      bibtexContent: '@article{einstein1905, title={Relativity}}'
    });

    expect(zipBlob.size).toBeGreaterThan(0);

    // Unpack ZIP in memory and assert entries
    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    expect(zip.file('main_sanitized.tex')).not.toBeNull();
    expect(zip.file('main.bbl')).not.toBeNull();
    expect(zip.file('figures/plot_0.png')).not.toBeNull();
    expect(zip.file('figures/plot_1.png')).not.toBeNull();

    const sanitizedTex = await zip.file('main_sanitized.tex')!.async('text');
    expect(sanitizedTex).toContain('Sub analysis section content with $E=mc^2$.');
  });

  it('6. High-Throughput Compliance Dossier SHA-256 Stability', async () => {
    const metadataMap = new Map();
    metadataMap.set('einstein1905', {
      title: 'Zur Elektrodynamik bewegter Korper',
      authors: ['Albert Einstein'],
      year: 1905,
      doi: '10.1002/andp.19053221004',
      provider: 'crossref'
    });

    const dossier1 = await generateComplianceDossier(manuscript, metadataMap);
    const dossier2 = await generateComplianceDossier(manuscript, metadataMap);

    expect(dossier1.documentFingerprint.rawSourceSha256).toBe(dossier2.documentFingerprint.rawSourceSha256);
    expect(dossier1.documentFingerprint.mathAstSha256).toBe(dossier2.documentFingerprint.mathAstSha256);
    expect(dossier1.documentFingerprint.totalLines).toBe(manuscript.split('\n').length);
    expect(dossier1.verificationSummary.verifiedCount).toBe(1);
  }, 15000);

  it('7. Rate Limiter Sliding Window Under Heavy Concurrency', async () => {
    const limiter = new ProviderRateLimiter(60, 10000);
    const tasks = Array.from({ length: 30 }, () => limiter.acquire(1));
    
    const results = await Promise.all(tasks);
    expect(results.length).toBe(30);
  });
});
