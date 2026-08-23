import { open } from '@tauri-apps/plugin-dialog';
import { readDir, readTextFile, writeTextFile, watch } from '@tauri-apps/plugin-fs';

export interface LocalFile {
  path: string;
  name: string;
  content: string;
}

let unwatchFn: (() => void) | null = null;

export async function watchWorkspace(
  dirPath: string, 
  onFileChanged: (filePath: string) => void
): Promise<void> {
  if (unwatchFn) {
    try {
      unwatchFn();
    } catch (e) {
      console.warn('[Tauri Watcher] Failed to cleanup previous watcher:', e);
    }
    unwatchFn = null;
  }
  
  try {
    // Watch the directory for Modify events
    unwatchFn = await watch(
      dirPath,
      (event) => {
        const eventType = event.type as any;
        const isModify = eventType === 'any' || 
                         eventType === 'modify' || 
                         (typeof eventType === 'object' && eventType !== null && 'modify' in eventType);


        if (isModify && event.paths) {
          for (const rawPath of event.paths) {
            const normalized = rawPath.replace(/\\/g, '/');
            if (normalized.endsWith('.tex') || normalized.endsWith('.bib')) {
              onFileChanged(normalized);
            }
          }
        }
      },
      { recursive: true }
    );
  } catch (err) {
    console.error('[Tauri Watcher] Failed to initialize:', err);
  }
}

// 1. Open the native OS folder picker
export async function openProjectDialog(): Promise<string | null> {
  try {
    const selectedPath = await open({ directory: true, multiple: false });
    return selectedPath ? (selectedPath as string) : null;
  } catch (error) {
    console.error('[Tauri FS] Dialog failed:', error);
    return null;
  }
}

// 2. Recursively find .tex and .bib files (simplified flat-read for this sprint)
export async function loadProjectFiles(dirPath: string): Promise<Record<string, LocalFile>> {
  const fileTree: Record<string, LocalFile> = {};
  
  try {
    const processDir = async (currentDir: string) => {
      const entries = await readDir(currentDir);
      for (const entry of entries) {
        const fullPath = `${currentDir}/${entry.name}`.replace(/\\/g, '/');
        if (entry.isDirectory) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await processDir(fullPath);
          }
        } else if ((entry as any).children) {
          for (const child of (entry as any).children) {
            if (child.name?.endsWith('.tex') || child.name?.endsWith('.bib')) {
              const childPath = child.path || `${fullPath}/${child.name}`;
              const content = await readTextFile(childPath);
              fileTree[childPath] = { path: childPath, name: child.name, content };
            }
          }
        } else if (entry.name?.endsWith('.tex') || entry.name?.endsWith('.bib') || entry.name?.endsWith('.md')) {
          const content = await readTextFile(fullPath);
          fileTree[fullPath] = { path: fullPath, name: entry.name, content };
        }
      }
    };

    await processDir(dirPath);
    return fileTree;
  } catch (error) {
    console.error('[Tauri FS] Directory read failed:', error);
    return {};
  }
}

// 3. Write changes back to the physical hard drive
export async function saveFileToDisk(filePath: string, content: string): Promise<boolean> {
  try {
    await writeTextFile(filePath, content);
    return true;
  } catch (error) {
    console.error(`[Tauri FS] Failed to write to ${filePath}:`, error);
    return false;
  }
}

// 4. Safely read text file from disk without throwing
export async function readTextFileSafely(filePath: string): Promise<string | null> {
  try {
    return await readTextFile(filePath);
  } catch (error) {
    return null;
  }
}


