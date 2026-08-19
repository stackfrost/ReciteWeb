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
