import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  tokenizeIncludes,
  parseTexToAST,
  resolveTexRelativePath,
  CircularReferenceError,
  LaTeXFileNotFoundError,
} from '../tex-parser';
import { LaTeXParser } from '../../../services/latex-parser';

describe('LaTeX Compiler & Traversal Engine', () => {
  it('TEST 1: Include Tokenization & Comment Stripping', () => {
    const sampleTex = `
\\documentclass{article}
% \\input{commented_out.tex}
\\begin{document}
\\section{Introduction}
We reference fundamental equations.
\\input{sections/intro.tex}
\\include{sections/methods}
\\subfile{sections/experiments/setup}
% Another comment with % escaped \\% and % \\input{fake.tex}
\\end{document}
    `;

    const includes = tokenizeIncludes(sampleTex, 'C:/project/main.tex');
    expect(includes.length).toBe(3);
    expect(includes[0].rawPath).toBe('sections/intro.tex');
    expect(includes[0].resolvedPath.endsWith('project/sections/intro.tex')).toBe(true);
    expect(includes[1].rawPath).toBe('sections/methods');
    expect(includes[1].resolvedPath.endsWith('project/sections/methods.tex')).toBe(true);
    expect(includes[2].includeType).toBe('subfile');
  });

  it('TEST 2: Multi-Directory Recursive File Traversal via fs/promises', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reciteai-tex-test-'));

    try {
      const mainTexPath = path.join(tempDir, 'main.tex');
      const sectionsDir = path.join(tempDir, 'sections');
      const methodsDir = path.join(sectionsDir, 'methods');
      await fs.mkdir(methodsDir, { recursive: true });

      const mainContent = `
\\documentclass{article}
\\begin{document}
\\title{Quantum Field Dynamics}
\\section{Overview}
\\input{sections/intro}
\\input{sections/methods/setup}
\\end{document}
      `;

      const introContent = `
\\section{Introduction}
Introduction prose here with \\cite{dirac1928, feynman1948}.
      `;

      const setupContent = `
\\subsection{Experimental Setup}
Setup details.
\\input{calibration}
      `;

      const calibrationContent = `
\\subsubsection{Calibration Procedure}
Calibrated using standard sensors.
      `;

      await fs.writeFile(mainTexPath, mainContent, 'utf-8');
      await fs.writeFile(path.join(sectionsDir, 'intro.tex'), introContent, 'utf-8');
      await fs.writeFile(path.join(methodsDir, 'setup.tex'), setupContent, 'utf-8');
      await fs.writeFile(path.join(methodsDir, 'calibration.tex'), calibrationContent, 'utf-8');

      const projectAST = await LaTeXParser.parseProject(mainTexPath);

      expect(projectAST.rootFilePath.endsWith('main.tex')).toBe(true);
      expect(projectAST.allFiles.length).toBe(4);
      expect(projectAST.rootNode.includes.length).toBe(2);

      const methodsInclude = projectAST.rootNode.includes.find((i) => i.rawPath.includes('setup'));
      expect(!!methodsInclude?.childDocument).toBe(true);

      const calibrationInclude = methodsInclude?.childDocument?.includes[0];
      expect(!!calibrationInclude).toBe(true);
      expect(calibrationInclude?.resolvedPath.includes('sections/methods/calibration.tex')).toBe(true);
      expect(!!calibrationInclude?.childDocument).toBe(true);

      expect(projectAST.flattenedContent.includes('Quantum Field Dynamics')).toBe(true);
      expect(projectAST.flattenedContent.includes('Introduction prose here')).toBe(true);
      expect(projectAST.flattenedContent.includes('Calibrated using standard sensors')).toBe(true);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('TEST 3: Circular Reference Cycle Detection', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'reciteai-tex-test-'));

    try {
      const mainTexPath = path.join(tempDir, 'main.tex');
      const sectionsDir = path.join(tempDir, 'sections');
      const methodsDir = path.join(sectionsDir, 'methods');
      await fs.mkdir(methodsDir, { recursive: true });

      const mainContent = `\\input{sections/methods/setup}`;
      const setupContent = `\\input{calibration}`;
      const calibrationContent = `\\input{../../main.tex}`;

      await fs.writeFile(mainTexPath, mainContent, 'utf-8');
      await fs.writeFile(path.join(methodsDir, 'setup.tex'), setupContent, 'utf-8');
      await fs.writeFile(path.join(methodsDir, 'calibration.tex'), calibrationContent, 'utf-8');

      await expect(LaTeXParser.parseProject(mainTexPath)).rejects.toThrow(CircularReferenceError);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('TEST 4: Virtual In-Memory Traversal & Cycle Detection', () => {
    const virtualFiles = {
      'main.tex': { text: '\\input{chapters/ch1}\n\\input{chapters/ch2}' },
      'chapters/ch1.tex': { text: 'Chapter 1 Content\n\\input{sub/ch1_sub.tex}' },
      'chapters/sub/ch1_sub.tex': { text: 'Sub-chapter 1 details.' },
      'chapters/ch2.tex': { text: 'Chapter 2 Content\n\\input{ch1}' },
    };

    const resolved = LaTeXParser.resolveIncludes(virtualFiles['main.tex'].text, virtualFiles, 'main.tex');
    expect(resolved.includes('Chapter 1 Content')).toBe(true);
    expect(resolved.includes('Sub-chapter 1 details')).toBe(true);

    const cyclicVirtualFiles = {
      'docA.tex': { text: 'Doc A \\input{docB}' },
      'docB.tex': { text: 'Doc B \\input{docA}' },
    };

    expect(() =>
      LaTeXParser.resolveIncludes(cyclicVirtualFiles['docA.tex'].text, cyclicVirtualFiles, 'docA.tex')
    ).toThrow(CircularReferenceError);
  });
});
