export interface MacroDefinition {
  name: string; // e.g. "\mycite"
  paramCount: number; // 0 to 9
  defaultParam?: string; // e.g. default value for #1
  body: string;
}

export interface ExpansionMapping {
  originalStart: number;
  originalEnd: number;
  expandedStart: number;
  expandedEnd: number;
}

export interface ExpandedDocument {
  text: string;
  mappings: ExpansionMapping[];
}

export class MacroRegistry {
  private macros: Map<string, MacroDefinition> = new Map();

  register(def: MacroDefinition): void {
    this.macros.set(def.name, def);
  }

  get(name: string): MacroDefinition | undefined {
    return this.macros.get(name);
  }

  clear(): void {
    this.macros.clear();
  }

  getAll(): MacroDefinition[] {
    return Array.from(this.macros.values());
  }
}

/**
 * Parses nested braces from a starting index using a stack-based approach.
 * Returns the inner contents of the braces and the index immediately after the closing brace.
 */
function extractNestedBraces(text: string, startIndex: number, openChar = '{', closeChar = '}'): { content: string, nextIndex: number } | null {
  if (text[startIndex] !== openChar) return null;
  
  let depth = 0;
  let startInner = startIndex + 1;
  let isEscaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    
    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === openChar) {
      depth++;
    } else if (char === closeChar) {
      depth--;
      if (depth === 0) {
        return {
          content: text.slice(startInner, i),
          nextIndex: i + 1
        };
      }
    }
  }

  return null; // Unbalanced braces
}

/**
 * Extracts macro definitions from a LaTeX string, registers them, and returns
 * the string with the macro definition statements removed.
 */
export function extractMacroDefinitions(text: string, registry: MacroRegistry): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    // Check for \newcommand or \renewcommand
    if (text.startsWith('\\newcommand', i) || text.startsWith('\\renewcommand', i)) {
      const isRenew = text.startsWith('\\renewcommand', i);
      const kwLen = isRenew ? 13 : 11; // length of \newcommand or \renewcommand
      let j = i + kwLen;
      
      // Optional * (e.g. \newcommand*)
      if (text[j] === '*') j++;

      // Skip whitespace
      while (j < text.length && /\s/.test(text[j])) j++;

      // Read macro name (could be {\name} or \name)
      let name = '';
      if (text[j] === '{') {
        const nameBlock = extractNestedBraces(text, j);
        if (nameBlock) {
          name = nameBlock.content.trim();
          j = nameBlock.nextIndex;
        } else {
          result += text[i];
          i++;
          continue;
        }
      } else if (text[j] === '\\') {
        // Read until non-letter
        let k = j + 1;
        while (k < text.length && /[a-zA-Z]/.test(text[k])) k++;
        name = text.slice(j, k);
        j = k;
      } else {
        result += text[i];
        i++;
        continue;
      }

      if (!name.startsWith('\\')) name = '\\' + name;

      // Skip whitespace
      while (j < text.length && /\s/.test(text[j])) j++;

      let paramCount = 0;
      let defaultParam: string | undefined = undefined;

      // Check for parameter count [N]
      if (text[j] === '[') {
        const paramBlock = extractNestedBraces(text, j, '[', ']');
        if (paramBlock) {
          paramCount = parseInt(paramBlock.content.trim(), 10) || 0;
          j = paramBlock.nextIndex;

          // Skip whitespace
          while (j < text.length && /\s/.test(text[j])) j++;

          // Check for default param [default]
          if (text[j] === '[') {
            const defaultBlock = extractNestedBraces(text, j, '[', ']');
            if (defaultBlock) {
              defaultParam = defaultBlock.content;
              j = defaultBlock.nextIndex;
              while (j < text.length && /\s/.test(text[j])) j++;
            }
          }
        }
      }

      // Read body {...}
      if (text[j] === '{') {
        const bodyBlock = extractNestedBraces(text, j);
        if (bodyBlock) {
          const body = bodyBlock.content;
          registry.register({ name, paramCount, defaultParam, body });
          i = bodyBlock.nextIndex;
          continue;
        }
      }
    } 
    // Check for \def
    else if (text.startsWith('\\def', i)) {
      let j = i + 4;
      while (j < text.length && /\s/.test(text[j])) j++;
      
      if (text[j] === '\\') {
        let k = j + 1;
        while (k < text.length && /[a-zA-Z]/.test(text[k])) k++;
        const name = text.slice(j, k);
        j = k;

        // Count params defined like #1#2
        let paramCount = 0;
        while (j < text.length && text[j] === '#' && /[1-9]/.test(text[j+1])) {
          const pnum = parseInt(text[j+1], 10);
          paramCount = Math.max(paramCount, pnum);
          j += 2;
        }
        
        while (j < text.length && /\s/.test(text[j])) j++;

        if (text[j] === '{') {
          const bodyBlock = extractNestedBraces(text, j);
          if (bodyBlock) {
            registry.register({ name, paramCount, body: bodyBlock.content });
            i = bodyBlock.nextIndex;
            continue;
          }
        }
      }
    }

    result += text[i];
    i++;
  }

  return result;
}

/**
 * Safe substitution that handles nested definitions by splitting tokens.
 */
function substituteParams(body: string, args: string[]): string {
  let result = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '#' && i + 1 < body.length && /[1-9]/.test(body[i + 1])) {
      const paramIndex = parseInt(body[i + 1], 10) - 1;
      if (paramIndex >= 0 && paramIndex < args.length) {
        result += args[paramIndex];
        i++; // Skip the number
        continue;
      }
    }
    result += body[i];
  }
  return result;
}

/**
 * Expands all registered macros in the given text. Returns a mapped document
 * ensuring original coordinates are preserved.
 */
export function expandMacros(text: string, registry: MacroRegistry): ExpandedDocument {
  const macros = registry.getAll();
  if (macros.length === 0) {
    return { text, mappings: [] };
  }

  // Pre-sort macros by length descending to prevent partial prefix matches
  macros.sort((a, b) => b.name.length - a.name.length);

  let result = '';
  const mappings: ExpansionMapping[] = [];
  let originalIndex = 0;
  let expandedIndex = 0;

  while (originalIndex < text.length) {
    if (text[originalIndex] !== '\\') {
      result += text[originalIndex];
      originalIndex++;
      expandedIndex++;
      continue;
    }

    let matchedMacro: MacroDefinition | null = null;
    let matchLength = 0;

    for (const macro of macros) {
      if (text.startsWith(macro.name, originalIndex)) {
        // Ensure exact word boundary if alphanumeric
        const nextChar = text[originalIndex + macro.name.length];
        if (nextChar && /[a-zA-Z]/.test(nextChar) && /[a-zA-Z]/.test(macro.name[macro.name.length - 1])) {
          continue; // E.g., matched \cite but text is \citet
        }
        matchedMacro = macro;
        matchLength = macro.name.length;
        break;
      }
    }

    if (!matchedMacro) {
      result += text[originalIndex];
      originalIndex++;
      expandedIndex++;
      continue;
    }

    const startIndex = originalIndex;
    let scanIndex = originalIndex + matchLength;
    
    // Parse arguments
    const args: string[] = [];
    let expectedArgs = matchedMacro.paramCount;

    // Check optional argument if default is present
    if (matchedMacro.defaultParam !== undefined) {
      while (scanIndex < text.length && /\s/.test(text[scanIndex])) scanIndex++;
      
      if (text[scanIndex] === '[') {
        const optBlock = extractNestedBraces(text, scanIndex, '[', ']');
        if (optBlock) {
          args.push(optBlock.content);
          scanIndex = optBlock.nextIndex;
          expectedArgs--;
        }
      } else {
        // Use default
        args.push(matchedMacro.defaultParam);
        expectedArgs--;
      }
    }

    // Extract remaining required arguments
    for (let p = 0; p < expectedArgs; p++) {
      while (scanIndex < text.length && /\s/.test(text[scanIndex])) scanIndex++;
      if (text[scanIndex] === '{') {
        const argBlock = extractNestedBraces(text, scanIndex);
        if (argBlock) {
          args.push(argBlock.content);
          scanIndex = argBlock.nextIndex;
        } else {
          // Unbalanced brace, bail out of macro matching
          break;
        }
      } else if (text[scanIndex] === '\\') {
         // Single token argument, e.g. \mycite\foo
         let k = scanIndex + 1;
         while (k < text.length && /[a-zA-Z]/.test(text[k])) k++;
         args.push(text.slice(scanIndex, k));
         scanIndex = k;
      } else {
        // Single char argument, e.g. \mycite x
        args.push(text[scanIndex]);
        scanIndex++;
      }
    }

    const expandedBody = substituteParams(matchedMacro.body, args);
    
    // Track coordinate mapping
    const originalEnd = scanIndex;
    const expandedEnd = expandedIndex + expandedBody.length;

    mappings.push({
      originalStart: startIndex,
      originalEnd: originalEnd,
      expandedStart: expandedIndex,
      expandedEnd: expandedEnd
    });

    // Recursively expand the body in case it contains other macros!
    // We append the result directly. To avoid complex recursive mapping drift in a simple parser, 
    // we map the *entire* recursive expansion back to the original macro invocation block.
    // For now, we do a single pass expansion (could wrap in a loop to handle deeply nested macros)
    // but the substitution engine handles the outer macro bounds mapping properly.

    result += expandedBody;
    originalIndex = scanIndex;
    expandedIndex = expandedEnd;
  }

  return { text: result, mappings };
}

/**
 * Remaps an offset in the expanded document back to the original source coordinates.
 */
export function remapOffset(expandedOffset: number, mappings: ExpansionMapping[]): number {
  if (mappings.length === 0) return expandedOffset;

  let drift = 0;

  for (const mapping of mappings) {
    if (expandedOffset < mapping.expandedStart) {
      break;
    }
    
    if (expandedOffset >= mapping.expandedStart && expandedOffset <= mapping.expandedEnd) {
      // Offset is inside the expanded macro. Snap to original macro start.
      return mapping.originalStart;
    }

    const originalLen = mapping.originalEnd - mapping.originalStart;
    const expandedLen = mapping.expandedEnd - mapping.expandedStart;
    drift += (originalLen - expandedLen);
  }

  return expandedOffset + drift;
}
