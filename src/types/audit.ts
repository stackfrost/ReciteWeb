export type FindingSeverity = 'critical' | 'medium' | 'low' | 'Critical' | 'High' | 'Medium' | 'Low';
export type FindingCategory = 'bib_mismatch' | 'literature_discovery';
export type StreamType = 'integrity' | 'discovery';

export interface VerifiedLiteratureSource {
  title: string;
  authors: string[];
  year: number;
  venue?: string;
  doi?: string;
  bibtexKey: string;
  relevanceScore: number;
  abstractSnippet: string;
  abstractExcerpt?: string;
  verificationStatus: 'verified' | 'unverified' | 'rejected';
  provenance?: 'zotero' | 'openalex' | 'crossref' | 'arxiv';
  isPersonalLibraryMatch?: boolean;
  bibtexEntry?: string;
  citationCount?: number;
  influentialCitationCount?: number;
}

export interface AuditFinding {
  id: string;
  line: number;
  category: FindingCategory;
  streamType?: StreamType;
  severity: FindingSeverity;
  type: string;
  citationKey?: string;
  claimText?: string;
  context: string;
  suggestedPatch?: {
    diffRemove: string;
    diffAdd: string;
  };
  suggestedFix?: string;
  verifiedSources?: VerifiedLiteratureSource[];
  status: 'unresolved' | 'resolved' | 'ignored' | 'pending' | 'accepted';
}
