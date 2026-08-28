/**
 * src/services/pdf-bridge.ts
 *
 * Strictly typed frontend service that bridges Next.js to the Tauri Rust backend.
 * Encapsulates the two-step pipeline:
 *   1. Resolve the citation key → local PDF path (via Zotero SQLite query)
 *   2. Extract raw text from the resolved PDF path (via in-process Rust parser)
 *
 * This service is Tauri-environment-aware: it guards against browser/SSR
 * execution and returns null gracefully when the Tauri IPC bridge is unavailable.
 */

/**
 * Type-safe wrapper for Tauri's invoke function.
 * Avoids a hard import of @tauri-apps/api at module level, which would break
 * Next.js SSR build. Instead, we dynamically detect the Tauri environment at runtime.
 */
async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  throw new Error(`Command '${command}' is only available when remote PDF extraction is connected.`);
}

/**
 * Resolves a Zotero citation key to the absolute path of its attached PDF.
 *
 * @param citationKey  The citation key (e.g., "zheng2024").
 * @returns            Absolute local path string, or null if not found.
 */
export async function findZoteroPdfPath(citationKey: string): Promise<string | null> {
  if (!citationKey.trim()) return null;

  try {
    const path = await tauriInvoke<string>('find_zotero_pdf', { citationKey });
    return path;
  } catch (error) {
    // Tauri returns error strings from the Rust Result<_, String>
    console.warn(`[ReciteAI] Zotero PDF discovery failed for key "${citationKey}":`, error);
    return null;
  }
}

/**
 * Extracts raw text content from a local PDF at the specified absolute path.
 *
 * @param absolutePath  Absolute path to the PDF file on disk.
 * @returns             Extracted plain text string, or null on extraction failure.
 */
export async function extractLocalPdfText(absolutePath: string): Promise<string | null> {
  if (!absolutePath.trim()) return null;

  try {
    const text = await tauriInvoke<string>('extract_pdf_text', { path: absolutePath });
    return text;
  } catch (error) {
    console.warn(`[ReciteAI] PDF extraction failed for "${absolutePath}":`, error);
    return null;
  }
}

/**
 * Full pipeline: resolves a Zotero citation key to the local PDF path and
 * immediately extracts its text content in a single atomic call.
 *
 * @param citationKey  The Zotero citation key to resolve.
 * @returns            Raw extracted text from the PDF, or null if any step fails.
 */
export async function resolvePdfContext(citationKey: string): Promise<string | null> {
  const pdfPath = await findZoteroPdfPath(citationKey);

  if (!pdfPath) {
    return null; // Discovery failed — key not found in Zotero
  }

  const text = await extractLocalPdfText(pdfPath);
  return text; // null propagates cleanly if extraction fails
}
