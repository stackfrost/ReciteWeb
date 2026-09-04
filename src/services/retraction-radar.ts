/**
 * src/services/retraction-radar.ts
 *
 * Retraction & Disputed Science Radar Engine
 * 
 * Provides deterministic detection of retracted papers, Expressions of Concern,
 * and scientific integrity corrections via OpenAlex, Crossref Crossmark, and an
 * instant-lookup curated index of landmark retractions.
 */

import { RetractionMetadata } from '@/types/audit';

// ── In-Memory Session Cache ───────────────────────────────────────────────────
const retractionCache = new Map<string, RetractionMetadata>();

/**
 * Normalizes DOI strings into a canonical, lowercase format.
 * Strips URL prefixes (https://doi.org/, http://dx.doi.org/), 'doi:', and trailing punctuation.
 */
export function normalizeDoi(rawDoi: string): string {
  if (!rawDoi) return '';
  return rawDoi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .replace(/[#?].*$/, '')
    .replace(/[/.]+$/, '');
}

/**
 * Curated Instant-Lookup Registry of Landmark Retracted Papers.
 * Provides guaranteed <1ms offline verification, test baseline controls,
 * and immediate air-gapped protection against notorious retracted claims.
 */
export const KNOWN_RETRACTIONS: Record<string, RetractionMetadata> = {
  // Wakefield et al., The Lancet 1998 (Falsified MMR vaccine & autism link)
  '10.1016/s0140-6736(97)11096-0': {
    isRetracted: true,
    status: 'retracted',
    noticeUrl: 'https://doi.org/10.1016/S0140-6736(10)60175-4',
    retractionDate: '2010-02-02',
    reason: 'Data fabrication, ethical violations, and falsified patient clinical histories.',
    crossmarkUpdated: true,
    source: 'curated_index',
  },
  // Mehra et al., The Lancet 2020 (Surgisphere hydroxychloroquine COVID-19 dataset fabrication)
  '10.1016/s0140-6736(20)31180-6': {
    isRetracted: true,
    status: 'retracted',
    noticeUrl: 'https://doi.org/10.1016/S0140-6736(20)31324-6',
    retractionDate: '2020-06-05',
    reason: 'Surgisphere dataset fabrication and unverifiable hospital registry data; authors unable to complete independent peer audit.',
    crossmarkUpdated: true,
    source: 'curated_index',
  },
  // Mehra et al., NEJM 2020 (Surgisphere Cardiovascular Disease in COVID-19)
  '10.1056/nejmoa2007621': {
    isRetracted: true,
    status: 'retracted',
    noticeUrl: 'https://doi.org/10.1056/NEJMc2021225',
    retractionDate: '2020-06-04',
    reason: 'Primary patient database inaccessible for verification by co-authors.',
    crossmarkUpdated: true,
    source: 'curated_index',
  },
  // Schön et al., Nature 2000 (Bell Labs - Field-effect superconductivity in organic crystals)
  '10.1038/nature01086': {
    isRetracted: true,
    status: 'retracted',
    noticeUrl: 'https://doi.org/10.1038/nature01478',
    retractionDate: '2003-03-06',
    reason: 'Falsified experimental transport data and duplicated noise curves across unrelated trials.',
    crossmarkUpdated: true,
    source: 'curated_index',
  },
  // Stapel et al., Science 2011 (Social psychology - Coping with Chaos)
  '10.1126/science.1214986': {
    isRetracted: true,
    status: 'retracted',
    noticeUrl: 'https://doi.org/10.1126/science.334.6060.1202-a',
    retractionDate: '2011-12-02',
    reason: 'Extensive scientific fraud and entirely fabricated experimental questionnaires.',
    crossmarkUpdated: true,
    source: 'curated_index',
  },
  // Obokata et al., Nature 2014 (STAP stimulus-triggered acquisition of pluripotency stem cells)
  '10.1038/nature12968': {
    isRetracted: true,
    status: 'retracted',
    noticeUrl: 'https://doi.org/10.1038/nature13598',
    retractionDate: '2014-07-02',
    reason: 'Critical errors in genomic data, image splicing, and failure of independent replication.',
    crossmarkUpdated: true,
    source: 'curated_index',
  },
  // Dias et al., Nature 2020 (Room-temperature superconductivity in carbonaceous sulfur hydride)
  '10.1038/s41586-020-2801-z': {
    isRetracted: true,
    status: 'retracted',
    noticeUrl: 'https://doi.org/10.1038/s41586-022-05287-7',
    retractionDate: '2022-09-26',
    reason: 'Non-standard, user-defined background subtraction irreproducible by independent researchers.',
    crossmarkUpdated: true,
    source: 'curated_index',
  },
  // Dasenbrock-Gammon et al., Nature 2023 (Near-ambient superconductivity in N-doped lutetium hydride)
  '10.1038/s41586-023-05742-0': {
    isRetracted: true,
    status: 'retracted',
    noticeUrl: 'https://doi.org/10.1038/s41586-023-06774-2',
    retractionDate: '2023-11-07',
    reason: 'Fabricated electrical resistance measurements and unverified raw calibration data.',
    crossmarkUpdated: true,
    source: 'curated_index',
  },
  // Séralini et al., Food & Chem Toxicology 2012 (Roundup GM maize cancer claims)
  '10.1016/j.fct.2012.08.005': {
    isRetracted: true,
    status: 'retracted',
    noticeUrl: 'https://doi.org/10.1016/j.fct.2013.11.047',
    retractionDate: '2014-01-01',
    reason: 'Inadequate cohort size and tumor-prone Sprague-Dawley strain rendering conclusions unsupportable.',
    crossmarkUpdated: true,
    source: 'curated_index',
  },
};

/**
 * Checks whether a given DOI exists in the curated landmark retractions registry.
 */
export function isKnownRetractedDoi(rawDoi: string): boolean {
  const clean = normalizeDoi(rawDoi);
  return Boolean(KNOWN_RETRACTIONS[clean]?.isRetracted);
}

/**
 * Checks the retraction status of a single DOI across:
 * 1. In-memory session cache
 * 2. Curated landmark retraction registry
 * 3. OpenAlex live API (`is_retracted`, `retraction_notice`)
 * 4. Crossref live API (`update-to` Crossmark retractions/corrections)
 *
 * Guaranteed non-throwing: returns clean status on network failure or 404s.
 */
export async function checkRetractionStatus(
  rawDoi: string,
  signal?: AbortSignal
): Promise<RetractionMetadata> {
  const cleanDoi = normalizeDoi(rawDoi);
  if (!cleanDoi) {
    return {
      isRetracted: false,
      status: 'clean',
      crossmarkUpdated: false,
      source: 'none',
    };
  }

  // 1. Check In-Memory Cache
  if (retractionCache.has(cleanDoi)) {
    return retractionCache.get(cleanDoi)!;
  }

  // 2. Check Curated Landmark Index
  if (KNOWN_RETRACTIONS[cleanDoi]) {
    const curated = KNOWN_RETRACTIONS[cleanDoi];
    retractionCache.set(cleanDoi, curated);
    return curated;
  }

  const adminEmail = process.env.NEXT_PUBLIC_RECITE_ADMIN_EMAIL || 'admin@recite.ai';

  // 3. Query OpenAlex Live API
  try {
    const openAlexUrl = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(cleanDoi)}?mailto=${encodeURIComponent(adminEmail)}`;
    const openAlexRes = await fetch(openAlexUrl, {
      signal: signal || AbortSignal.timeout(3000),
    });

    if (openAlexRes.ok) {
      const work = await openAlexRes.json();
      if (work?.is_retracted) {
        const metadata: RetractionMetadata = {
          isRetracted: true,
          status: 'retracted',
          noticeUrl: work.retraction_notice || undefined,
          retractionDate: work.retracted_date || undefined,
          reason: 'Official retraction confirmed in OpenAlex canonical registry.',
          crossmarkUpdated: false,
          source: 'openalex',
        };
        retractionCache.set(cleanDoi, metadata);
        return metadata;
      }
    }
  } catch (err: any) {
    // Non-fatal: proceed to Crossref fallback check
  }

  // 4. Query Crossref Live API (Crossmark / update-to inspect)
  try {
    const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}?mailto=${encodeURIComponent(adminEmail)}`;
    const crossrefRes = await fetch(crossrefUrl, {
      signal: signal || AbortSignal.timeout(3000),
    });

    if (crossrefRes.ok) {
      const data = await crossrefRes.json();
      const item = data?.message;
      const updates: Array<any> = item?.['update-to'] || [];

      // Check if any Crossmark update is a retraction or withdrawal
      const retractionUpdate = updates.find((u) => {
        const type = String(u?.type || '').toLowerCase();
        const label = String(u?.label || '').toLowerCase();
        return (
          type.includes('retract') ||
          label.includes('retract') ||
          type.includes('withdraw') ||
          label.includes('withdraw') ||
          type.includes('expression-of-concern') ||
          label.includes('expression of concern')
        );
      });

      if (retractionUpdate) {
        const isExpressionOfConcern =
          String(retractionUpdate.type || '').includes('concern') ||
          String(retractionUpdate.label || '').includes('concern');

        const metadata: RetractionMetadata = {
          isRetracted: true,
          status: isExpressionOfConcern ? 'expression_of_concern' : 'retracted',
          noticeUrl: retractionUpdate.DOI ? `https://doi.org/${retractionUpdate.DOI}` : undefined,
          retractionDate: retractionUpdate.updated?.['date-time'] || undefined,
          reason: retractionUpdate.label || 'Crossmark update indicates paper has been retracted or withdrawn.',
          crossmarkUpdated: true,
          source: 'crossref',
        };
        retractionCache.set(cleanDoi, metadata);
        return metadata;
      }
    }
  } catch (err: any) {
    // Non-fatal: Network or timeout
  }

  // 5. Default Clean Result
  const cleanMeta: RetractionMetadata = {
    isRetracted: false,
    status: 'clean',
    crossmarkUpdated: false,
    source: 'none',
  };
  retractionCache.set(cleanDoi, cleanMeta);
  return cleanMeta;
}

/**
 * Concurrently checks retraction status for a list of DOIs with deduplication.
 */
export async function batchCheckRetractions(
  dois: string[],
  signal?: AbortSignal
): Promise<Map<string, RetractionMetadata>> {
  const results = new Map<string, RetractionMetadata>();
  const uniqueDois = Array.from(new Set(dois.map(normalizeDoi).filter(Boolean)));

  await Promise.all(
    uniqueDois.map(async (doi) => {
      try {
        const meta = await checkRetractionStatus(doi, signal);
        results.set(doi, meta);
      } catch {
        results.set(doi, {
          isRetracted: false,
          status: 'clean',
          crossmarkUpdated: false,
          source: 'none',
        });
      }
    })
  );

  return results;
}
