import { get, set, del } from 'idb-keyval';

export interface LocalFile {
  path: string;
  name: string;
  content: string;
  lastModified?: number;
}

const IDB_WORKSPACE_KEY = 'reciteweb_active_workspace';
const IDB_FILES_KEY = 'reciteweb_workspace_files';
const LEGACY_IDB_WORKSPACE_KEY = 'citeassist_active_workspace';
const LEGACY_IDB_FILES_KEY = 'citeassist_workspace_files';

export async function watchWorkspace(
  _dirPath: string, 
  _onFileChanged: (filePath: string) => void
): Promise<void> {
  // Browser-native workspace watcher stub (managed via in-memory state & storage events)
}

/**
 * 1. Open the browser native Directory Picker (Chromium/Edge)
 */
export async function openProjectDialog(): Promise<Record<string, LocalFile> | null> {
  if (typeof window === 'undefined') return null;

  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      const files: Record<string, LocalFile> = {};
      await readDirectoryRecursively(dirHandle, '', files);
      await saveWorkspaceToIdb(dirHandle.name, files);
      return files;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[LocalFS] Directory picker error:', err);
      }
      return null;
    }
  }

  return null;
}

/**
 * Recursive reader for FileSystemDirectoryHandle
 */
async function readDirectoryRecursively(
  dirHandle: any,
  currentPath: string,
  outFiles: Record<string, LocalFile>
): Promise<void> {
  for await (const entry of dirHandle.values()) {
    const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      const file = await entry.getFile();
      if (file.name.endsWith('.tex') || file.name.endsWith('.bib') || file.name.endsWith('.sty') || file.name.endsWith('.cls')) {
        const content = await file.text();
        outFiles[entryPath] = {
          path: entryPath,
          name: file.name,
          content,
          lastModified: file.lastModified,
        };
      }
    } else if (entry.kind === 'directory') {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'target') {
        await readDirectoryRecursively(entry, entryPath, outFiles);
      }
    }
  }
}

/**
 * Ingest files from standard HTML file input (webkitdirectory)
 */
export async function ingestFileList(fileList: FileList): Promise<Record<string, LocalFile>> {
  const fileTree: Record<string, LocalFile> = {};
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const path = (file as any).webkitRelativePath || file.name;
    if (path.endsWith('.tex') || path.endsWith('.bib') || path.endsWith('.sty') || path.endsWith('.cls')) {
      const content = await file.text();
      fileTree[path] = {
        path,
        name: file.name,
        content,
        lastModified: file.lastModified,
      };
    }
  }

  await saveWorkspaceToIdb('Uploaded Project', fileTree);
  return fileTree;
}

/**
 * Persist active workspace files to client-side IndexedDB
 */
export async function saveWorkspaceToIdb(dirName: string, files: Record<string, LocalFile>): Promise<void> {
  try {
    await set(IDB_WORKSPACE_KEY, dirName);
    await set(IDB_FILES_KEY, files);
  } catch (err) {
    console.warn('[LocalFS] Failed to cache workspace to idb-keyval:', err);
  }
}

/**
 * Restore workspace files from client-side IndexedDB
 */
export async function restoreWorkspaceFromIdb(): Promise<{ dirName: string; files: Record<string, LocalFile> } | null> {
  try {
    let dirName = await get<string>(IDB_WORKSPACE_KEY);
    let files = await get<Record<string, LocalFile>>(IDB_FILES_KEY);
    if (!dirName || !files) {
      dirName = await get<string>(LEGACY_IDB_WORKSPACE_KEY);
      files = await get<Record<string, LocalFile>>(LEGACY_IDB_FILES_KEY);
    }
    if (dirName && files && Object.keys(files).length > 0) {
      return { dirName, files };
    }
    return null;
  } catch (err) {
    console.warn('[LocalFS] Failed to restore workspace from idb-keyval:', err);
    return null;
  }
}

/**
 * Clear cached workspace from IndexedDB
 */
export async function clearWorkspaceFromIdb(): Promise<void> {
  try {
    await del(IDB_WORKSPACE_KEY);
    await del(IDB_FILES_KEY);
    await del(LEGACY_IDB_WORKSPACE_KEY);
    await del(LEGACY_IDB_FILES_KEY);
  } catch {}
}

/**
 * 2. Recursively find .tex and .bib files (backward compatibility wrapper)
 */
export async function loadProjectFiles(dirPath: string): Promise<Record<string, LocalFile>> {
  const restored = await restoreWorkspaceFromIdb();
  if (restored && (restored.dirName === dirPath || !dirPath)) {
    return restored.files;
  }
  return {};
}

/**
 * 3. Save file content to storage
 */
export async function saveFileToDisk(filePath: string, content: string): Promise<boolean> {
  try {
    const files = (await get<Record<string, LocalFile>>(IDB_FILES_KEY)) || {};
    const name = filePath.split(/[/\\]/).pop() || filePath;
    files[filePath] = {
      path: filePath,
      name,
      content,
      lastModified: Date.now(),
    };
    await set(IDB_FILES_KEY, files);
    return true;
  } catch (err) {
    console.error(`[LocalFS] Failed to write ${filePath} to IndexedDB:`, err);
    return false;
  }
}

/**
 * 4. Safely read text file from storage
 */
export async function readTextFileSafely(filePath: string): Promise<string | null> {
  try {
    const files = await get<Record<string, LocalFile>>(IDB_FILES_KEY);
    if (files && files[filePath]) {
      return files[filePath].content;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 5. Ensure directory exists (no-op in virtual idb)
 */
export async function createDirSafely(_dirPath: string): Promise<boolean> {
  return true;
}

/**
 * 6. Check if file exists in storage
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const files = await get<Record<string, LocalFile>>(IDB_FILES_KEY);
    return Boolean(files && files[filePath]);
  } catch {
    return false;
  }
}
