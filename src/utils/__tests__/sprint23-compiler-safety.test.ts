import { describe, it, expect } from 'vitest';
import { stripLatexArtifacts } from '../latex-stripper';
import { mapProtectedZones, isInsideProtectedZone } from '../../services/latex-parser';

describe('Sprint 23: Compiler Safety & Query Sanitization', () => {
  describe('latex-stripper.ts', () => {
    it('strips display math blocks', () => {
      const text1 = 'The equation \\[ E=mc^2 \\] is famous.';
      const text2 = 'Another equation $$ E=mc^2 $$ is here.';
      expect(stripLatexArtifacts(text1)).toBe('The equation is famous.');
      expect(stripLatexArtifacts(text2)).toBe('Another equation is here.');
    });

    it('strips inline math blocks', () => {
      const text1 = 'Inline \\( a^2 + b^2 = c^2 \\) math.';
      const text2 = 'Also $x = y$ is inline.';
      expect(stripLatexArtifacts(text1)).toBe('Inline math.');
      expect(stripLatexArtifacts(text2)).toBe('Also is inline.');
    });

    it('strips formatting macros and retains content', () => {
      const text = 'Here is \\textbf{bold}, \\textit{italic}, and \\emph{emphasis}.';
      expect(stripLatexArtifacts(text)).toBe('Here is bold, italic, and emphasis.');
    });

    it('strips parameterless commands', () => {
      const text = 'Alpha \\alpha and \\rightarrow arrow.';
      expect(stripLatexArtifacts(text)).toBe('Alpha and arrow.');
    });
    
    it('cleans up excess whitespace and brackets', () => {
      const text = '  A   {test} string   with \\textbf{spaces}  ';
      expect(stripLatexArtifacts(text)).toBe('A test string with spaces');
    });
  });

  describe('latex-parser.ts protected zones', () => {
    it('maps equation environments', () => {
      const text = `
Here is text.
\\begin{equation}
  E = mc^2
\\end{equation}
More text.
      `;
      const zones = mapProtectedZones(text);
      expect(zones).toHaveLength(1);
      expect(zones[0].type).toBe('equation');
      expect(isInsideProtectedZone(text.indexOf('E = mc^2'), zones)).toBe(true);
      expect(isInsideProtectedZone(text.indexOf('Here is text.'), zones)).toBe(false);
      expect(isInsideProtectedZone(text.indexOf('More text.'), zones)).toBe(false);
    });

    it('maps display math environments', () => {
      const text = `
Text before.
$$
  a^2 + b^2 = c^2
$$
Text after.
      `;
      const zones = mapProtectedZones(text);
      expect(zones).toHaveLength(1);
      expect(zones[0].type).toBe('displaymath');
      expect(isInsideProtectedZone(text.indexOf('a^2'), zones)).toBe(true);
      expect(isInsideProtectedZone(text.indexOf('Text before.'), zones)).toBe(false);
    });
    
    it('maps multiple environments', () => {
      const text = `
\\begin{figure}
\\end{figure}
\\begin{align}
\\end{align}
      `;
      const zones = mapProtectedZones(text);
      expect(zones).toHaveLength(2);
      expect(zones[0].type).toBe('figure');
      expect(zones[1].type).toBe('align');
    });
  });
});
