export type FindingSeverity = 'critical' | 'medium' | 'low' | 'Critical' | 'High' | 'Medium' | 'Low';
export type FindingCategory = 'bib_mismatch' | 'literature_discovery';
export type StreamType = 'integrity' | 'discovery';

export interface RetractionMetadata {
  isRetracted: boolean;
  status: 'clean' | 'retracted' | 'expression_of_concern' | 'corrected';
  noticeUrl?: string;
  retractionDate?: string;
  reason?: string;
  crossmarkUpdated: boolean;
  source: 'openalex' | 'crossref' | 'curated_index' | 'none';
}

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
  provenance?: 'zotero' | 'openalex' | 'crossref' | 'arxiv' | 'europepmc' | 'semanticscholar' | 'pubmed';
  isPersonalLibraryMatch?: boolean;
  bibtexEntry?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  entailmentStatus?: 'entailed' | 'tenuous' | 'contradicted';
  hedgingSuggestion?: string;
  contradictionWarning?: string;
  retractionMetadata?: RetractionMetadata;
}

export type EntailmentStatus = 'entailed' | 'tenuous' | 'contradicted';

export interface ContrastiveEvidence {
  manuscriptClaim: string;
  sourceQuote: string;
  hedgingSuggestion?: string;
  reason: string;
}

export interface AuditFinding {
  id: string;
  line: number;
  globalLine?: number;
  localLine?: number;
  filePath?: string;
  category: FindingCategory;
  streamType?: StreamType;
  severity: FindingSeverity;
  type: string;
  citationKey?: string;
  claimText?: string;
  context: string;
  entailmentStatus?: EntailmentStatus;
  contrastiveEvidence?: ContrastiveEvidence;
  sectionTitle?: string;
  fileId?: string;
  isRetracted?: boolean;
  retractionMetadata?: RetractionMetadata;
  suggestedPatch?: {
    diffRemove: string;
    diffAdd: string;
  };
  suggestedFix?: string;
  verifiedSources?: VerifiedLiteratureSource[];
  status: 'unresolved' | 'resolved' | 'ignored' | 'dismissed' | 'pending' | 'accepted';
}

export interface DualStreamAuditResult {
  integrityFindings: AuditFinding[];
  discoveryFindings: AuditFinding[];
  allFindings: AuditFinding[];
  reciteClaims: any[];
  latencyMs: number;
}


// ── Agentic Reasoning & Progressive Telemetry Types ─────────────────────────

export type AgenticStepStage =
  | 'pending'
  | 'ast_integrity'
  | 'claim_decomposition'
  | 'dragnet_harvesting'
  | 'abstract_reconstruction'
  | 'nli_grading'
  | 'bibtex_synthesis'
  | 'complete'
  | 'error';


export interface DragnetCandidateSummary {
  doi?: string;
  title: string;
  authors: string[];
  year: number;
  source: 'openalex' | 'crossref' | 'zotero' | 'arxiv';
  reconstructedAbstractLength: number;
  entailmentScore?: number;
  entailmentVerdict?: 'entailed' | 'tenuous' | 'contradicted' | 'irrelevant';
}

export interface AgenticTraceNode {
  claimId: string;
  claimText: string;
  line: number;
  stage: AgenticStepStage;
  status: 'pending' | 'running' | 'completed' | 'failed';
  deconstructedQueries: string[];
  totalAbstractsHarvested: number;
  evaluatedCandidates: DragnetCandidateSummary[];
  winningSource?: VerifiedLiteratureSource;
  hedgingAdvice?: string;
  contradictionAlert?: string;
  startTimeMs: number;
  durationMs?: number;
  logs: string[];
}

export interface AgenticPipelineTelemetry {
  pipelineMode: 'deep_agentic_rag' | 'fast_ast_lint';
  totalClaims: number;
  completedClaims: number;
  currentClaimIndex: number;
  activeStage: AgenticStepStage;
  overallElapsedMs: number;
  traces: Record<string, AgenticTraceNode>;
}


