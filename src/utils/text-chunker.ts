export interface TextChunk {
  id: number;
  text: string;
  globalStartIndex: number;
}

export function splitStitchedDocument(stitchedText: string, chunkSize = 12000, overlap = 1000): TextChunk[] {
  const chunks: TextChunk[] = [];
  let currentIndex = 0;
  let chunkId = 0;

  while (currentIndex < stitchedText.length) {
    let endIndex = currentIndex + chunkSize;
    
    // Don't slice a word in half; try to find the nearest period or newline
    if (endIndex < stitchedText.length) {
      const nextNewline = stitchedText.indexOf('\n', endIndex);
      const nextPeriod = stitchedText.indexOf('. ', endIndex);
      
      if (nextNewline !== -1 && nextNewline - endIndex < 500) endIndex = nextNewline + 1;
      else if (nextPeriod !== -1 && nextPeriod - endIndex < 200) endIndex = nextPeriod + 2;
    } else {
      endIndex = stitchedText.length;
    }

    chunks.push({
      id: chunkId++,
      text: stitchedText.substring(currentIndex, endIndex),
      globalStartIndex: currentIndex
    });

    if (endIndex >= stitchedText.length) break;
    
    // Step forward, factoring in the overlap to prevent missed context
    currentIndex = endIndex - overlap; 
  }

  return chunks;
}
