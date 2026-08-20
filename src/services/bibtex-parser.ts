export interface BibTeXEntry {
  key: string;       // e.g., 'shimizu2025'
  type: string;      // e.g., 'article'
  title: string;
  author: string;
  year: string;
  raw: string;       // The original block
}

export class BibTeXParser {
  /**
   * Parses a BibTeX string into a Map of BibTeXEntry objects.
   * Handles nested braces and standard fields gracefully.
   */
  static parse(bibContent: string): Map<string, BibTeXEntry> {
    const entries = new Map<string, BibTeXEntry>();
    if (!bibContent) return entries;

    // Match @type{key, ...} block securely up to the first brace mismatch (simplified assumption)
    // We will extract blocks by looking for @[type]{
    const entryBlockRegex = /@([a-zA-Z]+)\s*\{\s*([^,]+),/g;
    let match;

    while ((match = entryBlockRegex.exec(bibContent)) !== null) {
      const type = match[1].toLowerCase();
      const key = match[2].trim();
      const startIndex = match.index;
      
      // Find the end of this block by counting braces
      let braceCount = 1;
      let currentIndex = entryBlockRegex.lastIndex;
      
      while (braceCount > 0 && currentIndex < bibContent.length) {
        if (bibContent[currentIndex] === '{') braceCount++;
        else if (bibContent[currentIndex] === '}') braceCount--;
        currentIndex++;
      }

      const rawBlock = bibContent.substring(startIndex, currentIndex);
      
      // Extract fields within the block
      const titleMatch = rawBlock.match(/title\s*=\s*(?:\{|"|)(.*?)(?:\}|"|,|\n|$)/i);
      const authorMatch = rawBlock.match(/author\s*=\s*(?:\{|"|)(.*?)(?:\}|"|,|\n|$)/i);
      const yearMatch = rawBlock.match(/year\s*=\s*(?:\{|"|)(.*?)(?:\}|"|,|\n|$)/i);

      entries.set(key, {
        key,
        type,
        title: titleMatch ? titleMatch[1].trim() : '',
        author: authorMatch ? authorMatch[1].trim() : '',
        year: yearMatch ? yearMatch[1].trim() : '',
        raw: rawBlock
      });
    }

    return entries;
  }

  /**
   * Generates a filtered BibTeX string containing only the entries
   * whose keys are in the provided `usedKeys` array.
   */
  static generateFilteredBib(
    usedKeys: string[],
    fullBibMap: Map<string, BibTeXEntry>
  ): string {
    const keySet = new Set(usedKeys.map((k) => k.trim()));
    const blocks: string[] = [];

    for (const key of keySet) {
      const entry = fullBibMap.get(key);
      if (entry) {
        blocks.push(entry.raw.trim());
      }
    }

    return blocks.join('\n\n') + '\n';
  }
}
