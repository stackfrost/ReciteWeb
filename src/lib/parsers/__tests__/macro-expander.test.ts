import { describe, it, expect, beforeEach } from 'vitest';
import {
  MacroRegistry,
  extractMacroDefinitions,
  expandMacros,
  remapOffset
} from '../macro-expander';

describe('LaTeX Macro Expander', () => {
  let registry: MacroRegistry;

  beforeEach(() => {
    registry = new MacroRegistry();
  });

  describe('Macro Extraction', () => {
    it('should extract a basic \\newcommand without parameters', () => {
      const tex = `Some text. \\newcommand{\\mycite}{\\citeauthor{Smith2024}} More text.`;
      const result = extractMacroDefinitions(tex, registry);
      
      expect(result).toBe('Some text.  More text.');
      const macro = registry.get('\\mycite');
      expect(macro).toBeDefined();
      expect(macro?.paramCount).toBe(0);
      expect(macro?.body).toBe('\\citeauthor{Smith2024}');
    });

    it('should extract a \\newcommand with parameters', () => {
      const tex = `\\newcommand{\\foo}[2]{#1 and #2}`;
      extractMacroDefinitions(tex, registry);
      
      const macro = registry.get('\\foo');
      expect(macro?.paramCount).toBe(2);
      expect(macro?.body).toBe('#1 and #2');
    });

    it('should extract a \\newcommand with a default optional parameter', () => {
      const tex = `\\newcommand{\\mycite}[2][Ref]{#1: \\cite{#2}}`;
      extractMacroDefinitions(tex, registry);
      
      const macro = registry.get('\\mycite');
      expect(macro?.paramCount).toBe(2);
      expect(macro?.defaultParam).toBe('Ref');
      expect(macro?.body).toBe('#1: \\cite{#2}');
    });

    it('should handle deeply nested braces in macro body', () => {
      const tex = `\\newcommand{\\complex}[1]{\\textbf{\\textit{#1 {and} {more {nested}}}}} body`;
      const result = extractMacroDefinitions(tex, registry);
      
      expect(result.trim()).toBe('body');
      const macro = registry.get('\\complex');
      expect(macro?.paramCount).toBe(1);
      expect(macro?.body).toBe('\\textbf{\\textit{#1 {and} {more {nested}}}}');
    });

    it('should extract primitive \\def macros', () => {
      const tex = `\\def\\mydef#1#2{Value #1 and #2} text`;
      extractMacroDefinitions(tex, registry);
      
      const macro = registry.get('\\mydef');
      expect(macro?.paramCount).toBe(2);
      expect(macro?.body).toBe('Value #1 and #2');
    });
  });

  describe('Macro Expansion & Substitution', () => {
    it('should substitute arguments correctly', () => {
      registry.register({ name: '\\foo', paramCount: 2, body: 'A:#1 B:#2' });
      const { text } = expandMacros('Call \\foo{x}{y}', registry);
      expect(text).toBe('Call A:x B:y');
    });

    it('should handle missing optional argument by using the default', () => {
      registry.register({ name: '\\mycite', paramCount: 2, defaultParam: 'Default', body: '#1 - #2' });
      const { text } = expandMacros('Test \\mycite{Smith}', registry);
      expect(text).toBe('Test Default - Smith');
    });

    it('should handle provided optional argument overriding the default', () => {
      registry.register({ name: '\\mycite', paramCount: 2, defaultParam: 'Default', body: '#1 - #2' });
      const { text } = expandMacros('Test \\mycite[Custom]{Smith}', registry);
      expect(text).toBe('Test Custom - Smith');
    });

    it('should handle up to 9 parameters', () => {
      registry.register({ name: '\\nine', paramCount: 9, body: '#1#2#3#4#5#6#7#8#9' });
      const { text } = expandMacros('\\nine{a}{b}{c}{d}{e}{f}{g}{h}{i}', registry);
      expect(text).toBe('abcdefghi');
    });
  });

  describe('Coordinate Preservation Mapping', () => {
    it('should accurately map offsets back to the original text', () => {
      registry.register({ name: '\\mycite', paramCount: 1, body: '\\citeauthor{#1} (\\citeyear{#1})' });
      
      // "Raw: \mycite{Einstein}" -> Length is 19
      // Expanded: "Raw: \citeauthor{Einstein} (\citeyear{Einstein})"
      const original = 'Raw: \\mycite{Einstein} End';
      
      const { text: expanded, mappings } = expandMacros(original, registry);
      
      // Verify expanded text
      expect(expanded).toBe('Raw: \\citeauthor{Einstein} (\\citeyear{Einstein}) End');

      // The word 'End' starts at index 23 in the original string.
      // In the expanded string, it starts at index 49.
      const expandedEndIndex = expanded.indexOf('End');
      expect(expandedEndIndex).toBe(49);

      const remappedIndex = remapOffset(expandedEndIndex, mappings);
      expect(remappedIndex).toBe(original.indexOf('End')); // 23

      // Inside the macro mapping
      // If we ask for the offset of 'citeauthor', it should map to the start of \mycite
      const citeauthorIndex = expanded.indexOf('citeauthor');
      const remappedInside = remapOffset(citeauthorIndex, mappings);
      expect(remappedInside).toBe(original.indexOf('\\mycite')); // 5
    });

    it('should accumulate drift across multiple macros', () => {
      registry.register({ name: '\\a', paramCount: 0, body: 'LONG' });
      registry.register({ name: '\\b', paramCount: 0, body: 'X' });
      
      // Original: 01234567890123456789
      //           Here \a and \b .
      const original = 'Here \\a and \\b .';
      
      const { text: expanded, mappings } = expandMacros(original, registry);
      expect(expanded).toBe('Here LONG and X .');

      const dotIndexExpanded = expanded.indexOf('.');
      const dotIndexOriginal = original.indexOf('.');
      expect(remapOffset(dotIndexExpanded, mappings)).toBe(dotIndexOriginal);
    });
  });
});
