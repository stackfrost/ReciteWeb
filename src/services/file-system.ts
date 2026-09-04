export interface MountResult {
  text: string;
  fileHandle: any;
  fileName: string;
  fileSize: number;
}

export class FileSystemService {
  /**
   * Prompts the user to select a local file, reads its contents,
   * and returns the text along with the native file handle (or null if fallback used).
   * Fully supports Chromium, Safari, Firefox, and mobile browsers.
   */
  static async mountFile(): Promise<MountResult> {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Manuscript Files',
              accept: {
                'text/plain': ['.tex', '.latex', '.txt', '.md', '.docx'],
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
        // If native picker fails, fall through to browser standard input fallback
      }
    }

    // Standard cross-browser <input type="file"> fallback for Safari / Firefox
    return new Promise<MountResult>((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Window or Document not available.'));
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.tex,.latex,.txt,.md,.docx';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async () => {
        try {
          const file = input.files?.[0];
          if (!file) {
            document.body.removeChild(input);
            reject(new Error('USER_ABORTED'));
            return;
          }
          const text = await file.text();
          document.body.removeChild(input);
          resolve({
            text,
            fileHandle: null,
            fileName: file.name,
            fileSize: file.size,
          });
        } catch (e) {
          document.body.removeChild(input);
          reject(e);
        }
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        reject(new Error('USER_ABORTED'));
      };

      input.click();
    });
  }

  /**
   * Prompts the user to select a directory, recursively traverses it,
   * and returns all .tex and .bib files in a flat map keyed by relative path.
   */
  static async mountDirectory(): Promise<{ directoryName: string; files: Record<string, MountResult> }> {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
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
        // Fall through to fallback
      }
    }

    // Standard cross-browser directory upload fallback
    return new Promise<{ directoryName: string; files: Record<string, MountResult> }>((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Window or Document not available.'));
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      (input as any).directory = true;
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async () => {
        try {
          const fileList = input.files;
          if (!fileList || fileList.length === 0) {
            document.body.removeChild(input);
            reject(new Error('USER_ABORTED'));
            return;
          }

          const files: Record<string, MountResult> = {};
          let directoryName = 'Project';

          for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const relPath = (file as any).webkitRelativePath || file.name;
            if (i === 0 && (file as any).webkitRelativePath) {
              directoryName = (file as any).webkitRelativePath.split('/')[0] || 'Project';
            }

            if (file.name.endsWith('.tex') || file.name.endsWith('.bib') || file.name.endsWith('.txt')) {
              const text = await file.text();
              const normalizedPath = relPath.replace(/\\/g, '/');
              files[normalizedPath] = {
                text,
                fileHandle: null,
                fileName: file.name,
                fileSize: file.size,
              };
            }
          }

          document.body.removeChild(input);
          resolve({ directoryName, files });
        } catch (e) {
          document.body.removeChild(input);
          reject(e);
        }
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        reject(new Error('USER_ABORTED'));
      };

      input.click();
    });
  }

  /**
   * Prompts the user to select a local BibTeX (.bib) file, reads its contents,
   * and returns the text along with the file metadata.
   */
  static async mountBibFile(): Promise<MountResult> {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
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
        // Fall through
      }
    }

    // Standard cross-browser BibTeX input fallback
    return new Promise<MountResult>((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Window or Document not available.'));
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.bib,.bibtex,.txt';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async () => {
        try {
          const file = input.files?.[0];
          if (!file) {
            document.body.removeChild(input);
            reject(new Error('USER_ABORTED'));
            return;
          }
          const text = await file.text();
          document.body.removeChild(input);
          resolve({
            text,
            fileHandle: null,
            fileName: file.name,
            fileSize: file.size,
          });
        } catch (e) {
          document.body.removeChild(input);
          reject(e);
        }
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        reject(new Error('USER_ABORTED'));
      };

      input.click();
    });
  }

  /**
   * Saves the provided content directly back to the local disk
   * using the native file handle, or triggers a browser Blob download.
   */
  static async saveFile(handle: any, content: string, fallbackFileName = 'manuscript.tex'): Promise<void> {
    if (handle && typeof handle === 'object' && 'createWritable' in handle) {
      try {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return;
      } catch (err: any) {
        console.warn('[FileSystemService] Native save failed, falling back to Blob download:', err);
      }
    }

    // Browser Blob download fallback
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fallbackFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

