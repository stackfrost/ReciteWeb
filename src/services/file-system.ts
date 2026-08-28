export interface MountResult {
  text: string;
  fileHandle: any;
  fileName: string;
  fileSize: number;
}

export class FileSystemService {
  /**
   * Prompts the user to select a local file, reads its contents,
   * and returns the text along with the native file handle.
   */
  static async mountFile(): Promise<MountResult> {
    if (!('showOpenFilePicker' in window)) {
      throw new Error('Native File System Access API is not supported in this environment.');
    }

    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Manuscript Files',
            accept: {
              'text/plain': ['.tex', '.latex', '.txt', '.md'],
            },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const text = await file.text();

      return {
        text,
        fileHandle: handle,
        fileName: file.name,
        fileSize: file.size,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('USER_ABORTED');
      }
      throw err;
    }
  }

  /**
   * Prompts the user to select a directory, recursively traverses it,
   * and returns all .tex and .bib files in a flat map keyed by relative path.
   */
  static async mountDirectory(): Promise<{ directoryName: string; files: Record<string, MountResult> }> {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('Native File System Access API is not supported in this environment.');
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      const files: Record<string, MountResult> = {};
      
      async function traverse(handle: any, currentPath: string) {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            if (entry.name.endsWith('.tex') || entry.name.endsWith('.bib') || entry.name.endsWith('.txt')) {
              try {
                const file = await entry.getFile();
                const text = await file.text();
                files[currentPath + entry.name] = {
                  text,
                  fileHandle: entry,
                  fileName: entry.name,
                  fileSize: file.size,
                };
              } catch (e) {
                console.warn(`Failed to read file ${entry.name}`, e);
              }
            }
          } else if (entry.kind === 'directory') {
            // Ignore common excluded directories
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await traverse(entry, currentPath + entry.name + '/');
            }
          }
        }
      }

      await traverse(dirHandle, '');

      return {
        directoryName: dirHandle.name,
        files,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('USER_ABORTED');
      }
      throw err;
    }
  }

  /**
   * Prompts the user to select a local BibTeX (.bib) file, reads its contents,
   * and returns the text along with the file metadata.
   */
  static async mountBibFile(): Promise<MountResult> {
    if (!('showOpenFilePicker' in window)) {
      throw new Error('Native File System Access API is not supported in this environment.');
    }

    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'BibTeX Database Files (*.bib, *.bibtex, *.txt)',
            accept: {
              'text/plain': ['.bib', '.bibtex', '.txt'],
            },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const text = await file.text();

      return {
        text,
        fileHandle: handle,
        fileName: file.name,
        fileSize: file.size,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('USER_ABORTED');
      }
      throw err;
    }
  }

  /**
   * Saves the provided content directly back to the local disk
   * using the previously acquired native file handle.
   */
  static async saveFile(handle: any, content: string): Promise<void> {
    if (!handle) {
      throw new Error('No active file handle provided. Cannot save file.');
    }

    try {
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (err: any) {
      throw new Error(`Failed to save file: ${err.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri IPC Bridge — Atomic Manuscript Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A strongly typed error thrown when the Rust atomic write command fails.
 * This is designed to be caught by the Next.js error boundary.
 *
 * @property {string} message  - The human-readable error message from Rust.
 * @property {string} filePath - The absolute path of the file that failed to write.
 */
export class DiskTransactionError extends Error {
  public readonly filePath: string;

  constructor(message: string, filePath: string) {
    super(message);
    this.name = 'DiskTransactionError';
    this.filePath = filePath;
    Object.setPrototypeOf(this, DiskTransactionError.prototype);
  }
}

/**
 * Invokes the Rust `apply_manuscript_patch` Tauri command to perform an atomic
 * write of the validated manuscript content to disk.
 *
 * PRECONDITION: This function MUST only be called after
 * `DiffGenerator.validatePatch()` returns `{ isValid: true }`. Calling this
 * before dry-run validation is a contract violation.
 *
 * The Rust backend guarantees:
 *   1. A `.bak` copy of the original file is created before any write.
 *   2. New content is written to a `.tmp` file.
 *   3. The `.tmp` file is atomically renamed to the target — no partial writes.
 *   4. On failure, the `.bak` is used to restore the original.
 *
 * @param filePath - Absolute path to the target `.tex` manuscript on disk.
 * @param content  - The fully validated post-mutation manuscript string.
 * @throws {DiskTransactionError} if the Rust backend reports any I/O failure.
 */
export async function writeValidatedAST(filePath: string, content: string): Promise<void> {
  const { saveFileToDisk } = await import('@/services/local-fs');
  const success = await saveFileToDisk(filePath, content);
  if (!success) {
    throw new DiskTransactionError('Failed to write manuscript to browser storage.', filePath);
  }
}

export async function writePatchLog(filePath: string, patchContent: string): Promise<void> {
  const { saveFileToDisk } = await import('@/services/local-fs');
  const patchPath = `${filePath}.patch`;
  await saveFileToDisk(patchPath, patchContent);
}

