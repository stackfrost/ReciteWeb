import { Claim, SuggestedPaper } from '../store';

/**
 * Extracts the last name from a full author name string.
 * Example: "A. R. Miller" -> "Miller"
 */
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  return parts[parts.length - 1].replace(/[^a-zA-Z]/g, '');
}

/**
 * Generates a deterministic mapping of paper IDs to BibTeX keys.
 * Handles collisions gracefully (e.g. Miller2022, Miller2022a, Miller2022b).
 */
export function generateCiteKeyMap(acceptedPapers: SuggestedPaper[]): Map<string, string> {
  const keyMap = new Map<string, string>(); // paperId -> citeKey
  const usedKeys = new Set<string>();

  acceptedPapers.forEach((paper) => {
    if (keyMap.has(paper.paperId!)) return; // Already generated

    const lastName = paper.authors && paper.authors.length > 0 
      ? getLastName(paper.authors[0]) 
      : 'Unknown';
    
    let baseKey = `${lastName}${paper.year}`;
    let finalKey = baseKey;
    let suffixCode = 97; // ASCII 'a'

    // Handle duplicate keys from same author + year
    while (usedKeys.has(finalKey)) {
      finalKey = `${baseKey}${String.fromCharCode(suffixCode)}`;
      suffixCode++;
    }

    usedKeys.add(finalKey);
    keyMap.set(paper.paperId!, finalKey);
  });

  return keyMap;
}

/**
 * Extracts all unique, accepted papers from the claims array.
 */
function getUniqueAcceptedPapers(claims: Claim[]): SuggestedPaper[] {
  const acceptedPapers = claims
    .filter((c) => c.status === 'accepted' && c.acceptedPaper)
    .map((c) => c.acceptedPaper!);

  const uniqueMap = new Map<string, SuggestedPaper>();
  acceptedPapers.forEach((paper) => {
    if (paper.paperId && !uniqueMap.has(paper.paperId)) {
      uniqueMap.set(paper.paperId, paper);
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Generates a standard BibTeX string format from accepted claims.
 */
export function generateBibtex(claims: Claim[]): string {
  const uniquePapers = getUniqueAcceptedPapers(claims);
  const keyMap = generateCiteKeyMap(uniquePapers);

  const bibtexEntries = uniquePapers.map((paper) => {
    const key = keyMap.get(paper.paperId!);
    const authorsStr = paper.authors ? paper.authors.join(' and ') : 'Unknown Author';
    
    // Standardize fields, falling back to empty strings if missing
    return `@article{${key},
  title = {${paper.title}},
  author = {${authorsStr}},
  year = {${paper.year}},
  doi = {${paper.doi || ''}},
  url = {${paper.url || ''}}
}`;
  });

  return bibtexEntries.join('\n\n');
}

/**
 * Injects \cite{key} tags into the manuscript text exactly where the claim ends.
 * Uses a reverse-splicing method to ensure string indices don't shift during injection.
 */
export function injectCitationsIntoText(parsedText: string, claims: Claim[]): string {
  const acceptedClaims = claims.filter((c) => c.status === 'accepted' && c.acceptedPaper);
  
  if (acceptedClaims.length === 0) return parsedText;

  const uniquePapers = getUniqueAcceptedPapers(acceptedClaims);
  const keyMap = generateCiteKeyMap(uniquePapers);

  // CRITICAL: Sort claims in descending order by endIndex.
  // When we inject text, it changes the length of the string. By going from bottom
  // to top, we ensure we don't accidentally offset the indices of earlier claims!
  const sortedClaims = [...acceptedClaims].sort((a, b) => b.endIndex - a.endIndex);

  let exportedText = parsedText;

  for (const claim of sortedClaims) {
    const paper = claim.acceptedPaper!;
    const citeKey = keyMap.get(paper.paperId!);
    
    // ~ prevents line breaks right before the citation tag in LaTeX
    const citeCommand = `~\\cite{${citeKey}}`; 
    
    exportedText = 
      exportedText.slice(0, claim.endIndex) + 
      citeCommand + 
      exportedText.slice(claim.endIndex);
  }

  return exportedText;
}