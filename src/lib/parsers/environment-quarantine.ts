import { randomBytes } from 'crypto';

export type QuarantineType = 'display_math' | 'inline_math' | 'tikz' | 'listing';

export interface QuarantinedBlock {
  id: string; // The inert cryptographic token
  type: QuarantineType;
  rawContent: string; // The exact unadulterated string
  originalCoordinates: {
    startOffset: number;
    endOffset: number;
  };
}

export class QuarantineVault {
  private blocks = new Map<string, QuarantinedBlock>();
  private counter = 0;

  /**
   * Registers a block and returns its unique replacement token.
   */
  register(type: QuarantineType, rawContent: string, startOffset: number, endOffset: number): string {
    const salt = typeof window === 'undefined' 
        ? randomBytes(4).toString('hex').toUpperCase()
        : Math.random().toString(36).substring(2, 10).toUpperCase();
        
    const id = `[[RECITEAI_QUARANTINE_${type.toUpperCase()}_${this.counter++}_${salt}]]`;
    this.blocks.set(id, {
      id,
      type,
      rawContent,
      originalCoordinates: { startOffset, endOffset }
    });
    return id;
  }

  get(id: string): QuarantinedBlock | undefined {
    return this.blocks.get(id);
  }

  getAll(): QuarantinedBlock[] {
    return Array.from(this.blocks.values());
  }

  clear(): void {
    this.blocks.clear();
    this.counter = 0;
  }
}

class CoordinateMapper {
  private records: Array<{ mutStart: number; mutEnd: number; delta: number }> = [];

  toOriginalOffset(mutStart: number): number {
    let delta = 0;
    for (let i = 0; i < this.records.length; i++) {
      if (this.records[i].mutEnd <= mutStart) {
        delta += this.records[i].delta;
      }
    }
    return mutStart + delta;
  }

  addReplacement(mutStart: number, mutEnd: number, origLength: number, tokenLength: number) {
    const shift = tokenLength - (mutEnd - mutStart);
    for (let i = 0; i < this.records.length; i++) {
      if (this.records[i].mutStart >= mutEnd) {
        this.records[i].mutStart += shift;
        this.records[i].mutEnd += shift;
      }
    }
    this.records.push({
      mutStart,
      mutEnd: mutStart + tokenLength,
      delta: origLength - tokenLength
    });
  }
}

/**
 * Strips fragile LaTeX environments into an isolated registry and replaces them with inert tokens.
 * Accurately tracks original source coordinates across all mutation passes without drift.
 */
export function quarantineSource(text: string, vault: QuarantineVault): string {
  let result = text;
  const mapper = new CoordinateMapper();

  // PASS 1: Block Environments
  const blockEnvs = ['equation', 'equation*', 'align', 'align*', 'gather', 'gather*', 'multline', 'multline*', 'tikzpicture', 'lstlisting'];
  let blockSearchIdx = 0;
  
  while (blockSearchIdx < result.length) {
    const beginIdx = result.indexOf('\\begin{', blockSearchIdx);
    if (beginIdx === -1) break;

    const endBraceIdx = result.indexOf('}', beginIdx + 7);
    if (endBraceIdx === -1) {
      blockSearchIdx = beginIdx + 7;
      continue;
    }

    const envName = result.slice(beginIdx + 7, endBraceIdx);
    if (blockEnvs.includes(envName)) {
      const endTag = `\\end{${envName}}`;
      const endTagIdx = result.indexOf(endTag, endBraceIdx);
      
      if (endTagIdx !== -1) {
        const fullEndIdx = endTagIdx + endTag.length;
        const rawContent = result.slice(beginIdx, fullEndIdx);
        
        let qType: QuarantineType = 'display_math';
        if (envName === 'tikzpicture') qType = 'tikz';
        else if (envName === 'lstlisting') qType = 'listing';

        const origStart = mapper.toOriginalOffset(beginIdx);
        const origEnd = origStart + rawContent.length;

        const token = vault.register(qType, rawContent, origStart, origEnd);
        mapper.addReplacement(beginIdx, fullEndIdx, rawContent.length, token.length);

        result = result.slice(0, beginIdx) + token + result.slice(fullEndIdx);
        blockSearchIdx = beginIdx + token.length;
        continue;
      }
    }
    blockSearchIdx = endBraceIdx + 1;
  }

  // PASS 2: Primitive Display Math ($$ ... $$ and \[ ... \])
  let i = 0;
  while (i < result.length) {
    // Escaped logic
    if (result[i] === '\\') {
      if (result[i + 1] === '[') {
        // found \[
        const startIdx = i;
        let endIdx = -1;
        for (let j = startIdx + 2; j < result.length; j++) {
          if (result[j] === '\\' && result[j + 1] === ']') {
            endIdx = j + 2;
            break;
          }
        }
        if (endIdx !== -1) {
          const rawContent = result.slice(startIdx, endIdx);
          const origStart = mapper.toOriginalOffset(startIdx);
          const origEnd = origStart + rawContent.length;

          const token = vault.register('display_math', rawContent, origStart, origEnd);
          mapper.addReplacement(startIdx, endIdx, rawContent.length, token.length);

          result = result.slice(0, startIdx) + token + result.slice(endIdx);
          i = startIdx + token.length;
          continue;
        }
      }
      i += 2; // skip escaped char
      continue;
    }

    if (result[i] === '$' && result[i + 1] === '$') {
      const startIdx = i;
      let endIdx = -1;
      let j = startIdx + 2;
      while (j < result.length) {
        if (result[j] === '\\') {
          j += 2;
          continue;
        }
        if (result[j] === '$' && result[j + 1] === '$') {
          endIdx = j + 2;
          break;
        }
        j++;
      }

      if (endIdx !== -1) {
        const rawContent = result.slice(startIdx, endIdx);
        const origStart = mapper.toOriginalOffset(startIdx);
        const origEnd = origStart + rawContent.length;

        const token = vault.register('display_math', rawContent, origStart, origEnd);
        mapper.addReplacement(startIdx, endIdx, rawContent.length, token.length);

        result = result.slice(0, startIdx) + token + result.slice(endIdx);
        i = startIdx + token.length;
        continue;
      }
    }
    i++;
  }

  // PASS 3: Inline Math ($ ... $ and \( ... \))
  let k = 0;
  while (k < result.length) {
    if (result[k] === '\\') {
      if (result[k + 1] === '(') {
        const startIdx = k;
        let endIdx = -1;
        for (let j = startIdx + 2; j < result.length; j++) {
          if (result[j] === '\\' && result[j + 1] === ')') {
            endIdx = j + 2;
            break;
          }
        }
        if (endIdx !== -1) {
          const rawContent = result.slice(startIdx, endIdx);
          const origStart = mapper.toOriginalOffset(startIdx);
          const origEnd = origStart + rawContent.length;

          const token = vault.register('inline_math', rawContent, origStart, origEnd);
          mapper.addReplacement(startIdx, endIdx, rawContent.length, token.length);

          result = result.slice(0, startIdx) + token + result.slice(endIdx);
          k = startIdx + token.length;
          continue;
        }
      }
      k += 2; // skip escaped char like \$
      continue;
    }

    if (result[k] === '$') {
      const startIdx = k;
      let endIdx = -1;
      let j = startIdx + 1;
      while (j < result.length) {
        if (result[j] === '\\') {
          j += 2;
          continue;
        }
        if (result[j] === '$') {
          endIdx = j + 1;
          break;
        }
        // Fail inline math if there are double line breaks (paragraphs shouldn't span inline math)
        if (result[j] === '\n' && result[j + 1] === '\n') {
          break;
        }
        j++;
      }

      if (endIdx !== -1) {
        const rawContent = result.slice(startIdx, endIdx);
        const origStart = mapper.toOriginalOffset(startIdx);
        const origEnd = origStart + rawContent.length;

        const token = vault.register('inline_math', rawContent, origStart, origEnd);
        mapper.addReplacement(startIdx, endIdx, rawContent.length, token.length);

        result = result.slice(0, startIdx) + token + result.slice(endIdx);
        k = startIdx + token.length;
        continue;
      }
    }
    k++;
  }

  return result;
}

/**
 * Re-injects raw LaTeX back into text (e.g. for saving or exporting).
 * Incorporates drift protection to strip hallucinated $ wrappers if the LLM generated them around tokens.
 */
export function reconstituteSource(llmOutput: string, vault: QuarantineVault): string {
  let result = llmOutput;
  const blocks = vault.getAll();

  for (const block of blocks) {
    // Find where the token is located in the LLM output
    let tokenIndex = result.indexOf(block.id);
    
    while (tokenIndex !== -1) {
      let replacementStart = tokenIndex;
      let replacementEnd = tokenIndex + block.id.length;

      // Drift Protection: LLM might surround an already-display-math token with $$...$$
      // E.g. $$[[RECITEAI_QUARANTINE_DISPLAY_MATH_0_F123]]$$
      if (
        replacementStart >= 2 && 
        result.slice(replacementStart - 2, replacementStart) === '$$' &&
        replacementEnd + 2 <= result.length && 
        result.slice(replacementEnd, replacementEnd + 2) === '$$'
      ) {
        replacementStart -= 2;
        replacementEnd += 2;
      }
      // Or might surround with single $...$
      else if (
        replacementStart >= 1 && 
        result[replacementStart - 1] === '$' &&
        replacementEnd < result.length && 
        result[replacementEnd] === '$'
      ) {
        replacementStart -= 1;
        replacementEnd += 1;
      }
      // Or might surround with \[...\]
      else if (
        replacementStart >= 2 && 
        result.slice(replacementStart - 2, replacementStart) === '\\[' &&
        replacementEnd + 2 <= result.length && 
        result.slice(replacementEnd, replacementEnd + 2) === '\\]'
      ) {
        replacementStart -= 2;
        replacementEnd += 2;
      }

      result = result.slice(0, replacementStart) + block.rawContent + result.slice(replacementEnd);
      
      // Search for any duplicated instances
      tokenIndex = result.indexOf(block.id, replacementStart + block.rawContent.length);
    }
  }

  return result;
}
