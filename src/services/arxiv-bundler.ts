import JSZip from 'jszip';
import { LaTeXParser, rehydrateQuarantinedMath } from './latex-parser';
import { parseMathBlocks, MathBlock } from '../lib/parsers/math-parser';
import { ComplianceDossier } from './compliance-dossier';

export interface BundleParams {
  mainTexContent: string;
  projectFiles: Record<string, any> | Map<string, any>;
  bibtexContent?: string;
  complianceDossier?: ComplianceDossier;
}

/**
 * Normalizes a file path to POSIX format, removing leading relative markers.
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

/**
 * Recursively inlines \input{}, \include{}, and \subfile{} declarations
 * with strict cycle detection and cross-platform path normalization.
 */
export function flattenLatexTree(
  rootContent: string,
  fileMap: Map<string, any> | Record<string, any>,
  currentPath: string = 'main.tex',
  visited: Set<string> = new Set<string>()
): string {
  const normalizedRoot = normalizePath(currentPath);

  if (visited.has(normalizedRoot)) {
    console.warn(`[Flattener] Circular dependency detected: ${normalizedRoot}`);
    return `% [CIRCULAR REFERENCE REMOVED: ${normalizedRoot}]`;
  }

  const nextVisited = new Set(visited).add(normalizedRoot);

  const includeRegex = /\\(input|include|subfile)\*?(?:\[[^\]]*\])?\{([^}]+)\}/g;
  let resolvedText = rootContent;

  resolvedText = resolvedText.replace(includeRegex, (match, _cmd, rawPath, offset) => {
    // Check if match is commented out
    const lineStart = resolvedText.lastIndexOf('\n', offset);
    const linePrefix = resolvedText.slice(lineStart === -1 ? 0 : lineStart + 1, offset);
    if (linePrefix.match(/(?<!\\)%/)) {
      return match; // Retain commented-out include verbatim
    }

    const cleanRaw = normalizePath((rawPath as string).replace(/^["']|["']$/g, ''));
    
    // Resolve candidates relative to current directory and relative to root
    const currentDir = normalizedRoot.includes('/')
      ? normalizedRoot.slice(0, normalizedRoot.lastIndexOf('/'))
      : '';
    
    const targetWithDir = currentDir ? `${currentDir}/${cleanRaw}` : cleanRaw;
    const normTargetWithDir = normalizePath(targetWithDir);

    const candidates = [
      normTargetWithDir.endsWith('.tex') ? normTargetWithDir : `${normTargetWithDir}.tex`,
      normTargetWithDir,
      cleanRaw.endsWith('.tex') ? cleanRaw : `${cleanRaw}.tex`,
      cleanRaw
    ];

    // Helper to find entry in fileMap (supports Map or Record/Object)
    const findCandidate = (): { content: string; key: string } | null => {
      for (const cand of candidates) {
        const normCand = cand.toLowerCase();
        if (fileMap instanceof Map) {
          for (const [k, v] of fileMap.entries()) {
            const normK = normalizePath(k);
            if (normK.toLowerCase() === normCand || normK.toLowerCase().endsWith('/' + normCand)) {
              const content = typeof v === 'string' ? v : (v.text || '');
              return { content, key: normK };
            }
          }
        } else if (fileMap && typeof fileMap === 'object') {
          for (const k of Object.keys(fileMap)) {
            const normK = normalizePath(k);
            if (normK.toLowerCase() === normCand || normK.toLowerCase().endsWith('/' + normCand)) {
              const val = fileMap[k];
              const content = typeof val === 'string' ? val : (val.text || '');
              return { content, key: normK };
            }
          }
        }
      }
      return null;
    };

    const target = findCandidate();

    if (target) {
      return flattenLatexTree(target.content, fileMap, target.key, nextVisited);
    }

    console.warn(`[Flattener] Could not resolve include: ${rawPath} from ${normalizedRoot}`);
    return `%% [Missing Include: ${rawPath}] %%`;
  });

  return resolvedText;
}

/**
 * Removes single-line LaTeX comments (% ...) while strictly preserving:
 * - Escaped percent signs (\%)
 * - URL parameters
 * - Math content
 */
export function stripLatexComments(tex: string): string {
  // 1. Quarantine URLs to protect % in URL parameters
  const urlMap = new Map<string, string>();
  let urlCounter = 0;
  
  let textToStrip = tex.replace(/\\(url|href)\*?(?:\[[^\]]*\])?\{([^}]+)\}/g, (match) => {
    const token = `[[URL_QUARANTINE_${urlCounter++}]]`;
    urlMap.set(token, match);
    return token;
  });

  // 2. Strip single-line comments safely
  const lines = textToStrip.split('\n');
  const strippedLines = lines.map(line => {
    let out = '';
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '\\') {
        out += line[i];
        if (i + 1 < line.length) {
          out += line[i + 1];
          i++;
        }
      } else if (line[i] === '%') {
        break; // Comment starts here
      } else {
        out += line[i];
      }
    }
    return out;
  });

  let sanitized = strippedLines.join('\n');

  // 3. Rehydrate URLs
  urlMap.forEach((originalUrl, token) => {
    sanitized = sanitized.split(token).join(originalUrl);
  });

  return sanitized;
}

export async function buildArxivBundle(params: BundleParams): Promise<Blob> {
  const { mainTexContent, projectFiles, bibtexContent, complianceDossier } = params;
  
  // 1. Flatten the LaTeX file tree (inline \input and \include)
  const flattened = flattenLatexTree(mainTexContent, projectFiles);
  
  // 2. Quarantine Math Blocks
  const { text: noMathText, mathBlocks } = parseMathBlocks(flattened);
  
  // 3. Strip single-line comments safely
  const sanitized = stripLatexComments(noMathText);
  
  // 4. Rehydrate Math
  const mathTokenMap = new Map<string, string>();
  mathBlocks.forEach((block, key) => mathTokenMap.set(key, block.content));
  const finalTex = rehydrateQuarantinedMath(sanitized, mathTokenMap);
  
  // 5. Harvest Assets
  const assetRegex = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
  const assetsToInclude = new Set<string>();
  let match;
  while ((match = assetRegex.exec(finalTex)) !== null) {
    const assetPath = normalizePath(match[1]);
    if (assetPath) {
      assetsToInclude.add(assetPath);
    }
  }
  
  // 6. Build ZIP
  const zip = new JSZip();
  
  // Add main tex
  zip.file('main_sanitized.tex', finalTex);
  
  // Add bibtex
  if (bibtexContent) {
    zip.file('main.bbl', bibtexContent);
  }
  
  // Add dossier
  if (complianceDossier) {
    zip.file('AUDIT_CERTIFICATE.json', JSON.stringify(complianceDossier, null, 2));
  }
  
  // Add harvested figure assets
  const missingAssets: string[] = [];
  for (const rawAssetPath of assetsToInclude) {
    const normAsset = normalizePath(rawAssetPath);
    const possibleExtensions = ['', '.png', '.jpg', '.jpeg', '.pdf', '.eps', '.svg'];
    let foundKey: string | null = null;
    let foundData: Uint8Array | string | null = null;

    const findAssetEntry = (search: string) => {
      const normSearch = normalizePath(search).toLowerCase();
      if (projectFiles instanceof Map) {
        for (const [k, v] of projectFiles.entries()) {
          const normK = normalizePath(k);
          if (normK.toLowerCase() === normSearch || normK.toLowerCase().endsWith('/' + normSearch)) {
            return { key: normK, data: typeof v === 'string' ? v : (v.data || v.text || v) };
          }
        }
      } else if (projectFiles && typeof projectFiles === 'object') {
        for (const k of Object.keys(projectFiles)) {
          const normK = normalizePath(k);
          if (normK.toLowerCase() === normSearch || normK.toLowerCase().endsWith('/' + normSearch)) {
            const entry = projectFiles[k];
            return { key: normK, data: typeof entry === 'string' ? entry : (entry.data || entry.text || entry) };
          }
        }
      }
      return null;
    };

    for (const ext of possibleExtensions) {
      const searchCandidate = normAsset.endsWith(ext) ? normAsset : `${normAsset}${ext}`;
      const entry = findAssetEntry(searchCandidate);
      if (entry) {
        foundKey = entry.key;
        foundData = entry.data;
        break;
      }
    }

    if (foundKey && foundData) {
      zip.file(foundKey, foundData);
    } else {
      missingAssets.push(rawAssetPath);
      console.warn(`[ArxivBundler] Missing asset: ${rawAssetPath}`);
    }
  }
  
  return await zip.generateAsync({ type: 'blob' });
}

export function triggerZipDownload(blob: Blob, filename = 'arxiv_submission.zip'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
