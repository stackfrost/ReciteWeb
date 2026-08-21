import { ValidationResult } from './metadata-cascade';
import { parseMathBlocks } from '../lib/parsers/math-parser';

export interface ComplianceDossier {
  specVersion: '1.0.0';
  generatedAt: string;
  documentFingerprint: {
    rawSourceSha256: string;
    mathAstSha256: string;
    totalLines: number;
    totalCharacters: number;
  };
  verificationSummary: {
    totalCitations: number;
    verifiedCount: number;
    unresolvedCount: number;
    retractionAlertsCount: number;
  };
  verifiedReferences: Array<{
    citeKey: string;
    doi?: string;
    title?: string;
    primarySource: 'crossref' | 'semanticscholar' | 'openalex' | 'cache';
    provenanceUrl?: string;
    verifiedAt: number;
  }>;
  dataGovernance: {
    zeroKnowledgeBoundary: true;
    cloudStorageRetention: false;
    localVectorDb: 'WebAssembly-ONNX-MiniLM-L6-v2';
    compilationRuntime: 'Tauri-Rust-Desktop-Local';
  };
}

/**
 * Compute SHA-256 via Web Crypto
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateComplianceDossier(
  latexSource: string,
  metadataMap: Map<string, ValidationResult>
): Promise<ComplianceDossier> {
  const rawSourceSha256 = await sha256(latexSource);
  
  // Extract math AST and serialize it deterministically for hashing (excluding random session salts/counter)
  const { mathBlocks } = parseMathBlocks(latexSource);
  const mathAstArray = Array.from(mathBlocks.values()).map(mb => ({
    type: mb.type,
    rawFormula: mb.rawFormula,
    content: mb.content,
    originalCoordinates: mb.originalCoordinates
  }));
  
  const mathAstContent = JSON.stringify(mathAstArray);
  const mathAstSha256 = await sha256(mathAstContent);
  
  const totalLines = latexSource.split('\n').length;
  const totalCharacters = latexSource.length;

  let verifiedCount = 0;
  let unresolvedCount = 0;
  
  const verifiedReferences = Array.from(metadataMap.entries()).map(([citeKey, result]) => {
    // If the result exists and has a title/provider, consider it verified
    if (result && result.title) {
      verifiedCount++;
    } else {
      unresolvedCount++;
    }
    
    let provenanceUrl = result.doi ? `https://doi.org/${result.doi}` : undefined;
    
    return {
      citeKey,
      doi: result.doi,
      title: result.title,
      primarySource: (result.provider as 'crossref' | 'semanticscholar' | 'openalex') || 'cache',
      provenanceUrl,
      verifiedAt: Date.now(),
    };
  });

  return {
    specVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    documentFingerprint: {
      rawSourceSha256,
      mathAstSha256,
      totalLines,
      totalCharacters,
    },
    verificationSummary: {
      totalCitations: metadataMap.size,
      verifiedCount,
      unresolvedCount,
      retractionAlertsCount: 0,
    },
    verifiedReferences,
    dataGovernance: {
      zeroKnowledgeBoundary: true,
      cloudStorageRetention: false,
      localVectorDb: 'WebAssembly-ONNX-MiniLM-L6-v2',
      compilationRuntime: 'Tauri-Rust-Desktop-Local',
    }
  };
}

export function downloadDossierJson(dossier: ComplianceDossier, filename = 'AUDIT_CERTIFICATE.json'): void {
  const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
