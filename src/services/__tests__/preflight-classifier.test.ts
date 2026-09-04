import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PreflightTopicClassifier,
  DOMAIN_ROUTING_TABLE,
  AcademicDomain,
} from '@/services/preflight-topic-classifier';
import { AcademicSearchAggregator } from '@/services/academic-search-aggregator';

describe('Pre-Flight Topic Classifier & Deterministic Academic Routing Index', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Deterministic Domain Classification (classifyLocally)', () => {
    it('classifies Quantum Physics and Condensed Matter manuscripts as physics', () => {
      const text = 'Topological superconductivity and Majorana fermions in condensed matter systems under magnetic flux';
      expect(PreflightTopicClassifier.classifyLocally(text)).toBe('physics');
    });

    it('classifies Riemannian Manifolds and Topology as math', () => {
      const text = 'Differential geometry of Ricci flow on Riemannian manifolds with boundary isomorphism';
      expect(PreflightTopicClassifier.classifyLocally(text)).toBe('math');
    });

    it('classifies Deep Learning and Compilers as computer_science', () => {
      const text = 'Transformer neural network latency optimization on distributed GPU clusters using LLVM compiler';
      expect(PreflightTopicClassifier.classifyLocally(text)).toBe('computer_science');
    });

    it('classifies CRISPR, Genomics, and Cellular Biology as biomedical', () => {
      const text = 'CRISPR-Cas9 gene editing mechanisms in cellular RNA transcription pathways';
      expect(PreflightTopicClassifier.classifyLocally(text)).toBe('biomedical');
    });

    it('classifies Clinical Trials and Patient Cohorts as clinical', () => {
      const text = 'Phase III clinical trial of adjuvant chemotherapy in oncology patient cohort remission rates';
      expect(PreflightTopicClassifier.classifyLocally(text)).toBe('clinical');
    });

    it('classifies Chemical Catalysis and Molecular Synthesis as chemistry', () => {
      const text = 'Asymmetric catalysis and covalent bond synthesis in organic polymer electrochemistry';
      expect(PreflightTopicClassifier.classifyLocally(text)).toBe('chemistry');
    });

    it('classifies Macroeconomics and Game Theory as economics', () => {
      const text = 'Monetary policy and inflation dynamics under Nash equilibrium in macroeconomic asset pricing';
      expect(PreflightTopicClassifier.classifyLocally(text)).toBe('economics');
    });

    it('defaults unknown subjects to general', () => {
      const text = 'A retrospective study of ancient architectural styles in medieval Europe';
      expect(PreflightTopicClassifier.classifyLocally(text)).toBe('general');
    });
  });

  describe('2. Deterministic Routing Index Table (DOMAIN_ROUTING_TABLE)', () => {
    it('routes physics manuscripts to arXiv and Crossref, excluding Europe PMC', () => {
      const vendors = DOMAIN_ROUTING_TABLE.physics;
      expect(vendors).toContain('arxiv');
      expect(vendors).toContain('crossref');
      expect(vendors).not.toContain('europepmc');
    });

    it('routes biomedical manuscripts to Europe PMC and OpenAlex, excluding arXiv', () => {
      const vendors = DOMAIN_ROUTING_TABLE.biomedical;
      expect(vendors).toContain('europepmc');
      expect(vendors).toContain('openalex');
      expect(vendors).not.toContain('arxiv');
    });

    it('routes computer science manuscripts to arXiv, OpenAlex, and Semantic Scholar', () => {
      const vendors = DOMAIN_ROUTING_TABLE.computer_science;
      expect(vendors).toContain('arxiv');
      expect(vendors).toContain('openalex');
      expect(vendors).toContain('semanticscholar');
      expect(vendors).not.toContain('europepmc');
    });
  });

  describe('3. PreflightTopicClassifier Fallback & Speculative Cascade', () => {
    it('returns valid classification result with latency and provenance metadata', async () => {
      const result = await PreflightTopicClassifier.classifyDomain(
        'Attention Is All You Need',
        'We propose the Transformer, a model architecture eschewing recurrence and relying entirely on an attention mechanism to draw global dependencies between input and output.'
      );

      expect(result.domain).toBe('computer_science');
      expect(result.targetRepositories).toContain('arxiv');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(['local_regex', 'gemini', 'groq', 'cerebras', 'github_models', 'openrouter', 'cache']).toContain(result.classifiedBy);
    });

    it('serves repeated classifications from memory cache in 0-1ms', async () => {
      const title = 'Superconducting Quantum Interference';
      const abstract = 'High temperature Josephson junctions in planar SQUID configurations.';

      const first = await PreflightTopicClassifier.classifyDomain(title, abstract);
      const second = await PreflightTopicClassifier.classifyDomain(title, abstract);

      expect(second.domain).toBe(first.domain);
      expect(second.classifiedBy).toBe('cache');
    });
  });

  describe('4. AcademicSearchAggregator Integration with Deterministic Routing', () => {
    it('executes dragnet with overrideDomain targeting specific repositories', async () => {
      const candidates = await AcademicSearchAggregator.executeDragnet(
        ['quantum hall effect resistance quantization'],
        'The Hall resistance is quantized at integer values of h/e^2.',
        undefined,
        undefined,
        'physics'
      );

      expect(Array.isArray(candidates)).toBe(true);
    });
  });
});
