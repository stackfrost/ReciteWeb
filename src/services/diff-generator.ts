import { createPatch } from 'diff';
import { Claim } from '@/lib/store';

/**
 * Unified Diff & Patch Generator
 *
 * Generates standard Git-compatible unified `.patch` files comparing
 * the original manuscript text against the remediated manuscript incorporating
 * all AI-suggested citation fixes.
 */
export class DiffGenerator {
  /**
   * Generates a unified diff patch string from the original manuscript and a list of claims.
   * Only claims containing a valid `suggestedFix` are applied to the modified buffer.
   *
   * @param originalText The baseline unedited manuscript text.
   * @param claims List of claims identified during the pre-flight audit.
   * @param fileName The target filename (e.g. 'manuscript.tex').
   * @returns Git-compatible unified diff patch formatted string.
   */
  static generateUnifiedPatch(
    originalText: string,
    claims: Claim[],
    fileName: string = 'manuscript.tex'
  ): string {
    if (!originalText) {
      return '';
    }

    // Filter to claims that provide an actionable suggested fix
    const actionableClaims = claims.filter(
      (c) => typeof c.suggestedFix === 'string' && c.suggestedFix.trim().length > 0
    );

    if (actionableClaims.length === 0) {
      // Return empty patch or 0-diff patch
      return createPatch(fileName, originalText, originalText, 'Original', 'ReciteAI Fixes');
    }

    // Sort claims by startIndex to preserve positional integrity where possible
    const sortedClaims = [...actionableClaims].sort((a, b) => a.startIndex - b.startIndex);

    let modifiedText = originalText;

    for (const claim of sortedClaims) {
      const targetText = claim.text;
      const replacement = claim.suggestedFix!;
      if (!targetText || !replacement) continue;

      let scopedSuccess = false;

      // 1. Context-Scoped Block Replacement
      if (claim.context && claim.context.trim().length > 0) {
        const contextStr = claim.context.trim();
        const contextIndex = modifiedText.indexOf(contextStr);

        if (contextIndex !== -1 && contextStr.includes(targetText)) {
          const modifiedContext = contextStr.replace(targetText, replacement);
          modifiedText =
            modifiedText.slice(0, contextIndex) +
            modifiedContext +
            modifiedText.slice(contextIndex + contextStr.length);
          scopedSuccess = true;
        } else {
          // Search by paragraph boundaries if exact context string isn't continuous
          const paragraphs = modifiedText.split(/\n\s*\n/);
          let foundIdx = -1;

          for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            if (
              p.includes(targetText) &&
              (contextStr.includes(p.slice(0, 30)) || p.includes(contextStr.slice(0, 30)))
            ) {
              paragraphs[i] = p.replace(targetText, replacement);
              foundIdx = i;
              break;
            }
          }

          if (foundIdx !== -1) {
            modifiedText = paragraphs.join('\n\n');
            scopedSuccess = true;
          }
        }
      }

      // 2. Fallback: single direct occurrence replacement if context scoping did not match
      if (!scopedSuccess && modifiedText.includes(targetText)) {
        modifiedText = modifiedText.replace(targetText, replacement);
      }
    }

    // Generate standard unified patch
    return createPatch(fileName, originalText, modifiedText, 'Original', 'ReciteAI Fixes');
  }
}

export function generateUnifiedPatch(
  originalText: string,
  claims: Claim[],
  fileName: string = 'manuscript.tex'
): string {
  return DiffGenerator.generateUnifiedPatch(originalText, claims, fileName);
}
