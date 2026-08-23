export function stripLatexArtifacts(rawText: string): string {
  if (!rawText) return '';
  return rawText
    // Remove display math \[...\] or $$...$$
    .replace(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g, ' ')
    // Remove inline math $...$ or \(...\)
    .replace(/\\\((.*?)\\\)|\$(.*?)\$/g, ' ')
    // Remove simple formatting commands like \textbf{text} -> text
    .replace(/\\(?:textbf|textit|emph|underline)\{([^}]+)\}/g, '$1')
    // Remove parameterless commands like \alpha, \beta, \rightarrow
    .replace(/\\[a-zA-Z]+/g, ' ')
    // Clean up leftover brackets and excess whitespace
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
