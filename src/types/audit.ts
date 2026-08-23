export type FindingSeverity = 'critical' | 'medium' | 'low';
export type FindingCategory = 'bib_mismatch' | 'literature_discovery';

export interface VerifiedLiteratureSource {
  title: string;
  authors: string[];
  year: number;
  doi?: string;
  bibtexKey: string;
  relevanceScore: number;
  abstractSnippet: string;
  verificationStatus: 'verified' | 'unverified' | 'rejected';
}

export interface AuditFinding {
  id: string;
  line: number;
  category: FindingCategory;
  severity: FindingSeverity;
  type: string; // e.g., "Missing BibTeX Key", "Unsupported Claim", "Weak Citation"
  citationKey?: string;
  claimText?: string;
  context: string;
  suggestedPatch?: {
    diffRemove: string;
    diffAdd: string;
  };
  verifiedSources?: VerifiedLiteratureSource[];
  status: 'unresolved' | 'resolved' | 'ignored';
}
