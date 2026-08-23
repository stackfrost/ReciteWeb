export function rewriteBibtexKey(rawBibtex: string, targetKey: string): string {
  // Matches the start of a BibTeX entry, e.g., @article{smith_2024, and replaces the key
  return rawBibtex.replace(/(@[a-zA-Z]+\{)[^,]+,/i, `$1${targetKey},`);
}

export function synthesizeQueryFromKey(citeKey: string, contextSnippet: string): string {
  // Break "MooreRead1991" into "Moore Read 1991"
  const spacedKey = citeKey.replace(/([A-Z])/g, ' $1').replace(/([0-9]{4})/g, ' $1').trim();
  
  // Extract long/rare words from context to act as physical keywords
  const cleanContext = (contextSnippet || '').replace(/[^a-zA-Z0-9\s]/g, ' ');
  const words = cleanContext.split(/\s+/).filter(w => w.length > 5);
  const topKeywords = words.slice(0, 3).join(' '); // Grab up to 3 descriptive words

  return `${spacedKey} ${topKeywords}`;
}
