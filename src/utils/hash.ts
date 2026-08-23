/**
 * Generates a semantic ID for an audit finding that survives spatial shifting.
 * Example: generateSemanticId('missing_cite', 'Prada2020') -> 'missing_cite_Prada2020'
 */
export function generateSemanticId(type: string, corePayload: string): string {
  const sanitizedPayload = corePayload.replace(/[^a-zA-Z0-9]/g, '_');
  return `${type}_${sanitizedPayload}`.toLowerCase();
}
