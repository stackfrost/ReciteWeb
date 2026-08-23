export interface GeneratedBibtex {
  bibtex: string;
  citeKey: string;
}

export function generateBibtex(crossrefData: any): GeneratedBibtex {
  const type = crossrefData?.type === 'journal-article' ? 'article' : 'misc';
  const authors = crossrefData?.author?.map((a: any) => `${a.family || ''}, ${a.given || ''}`.trim()).filter(Boolean).join(' and ') || 'Unknown';
  const title = crossrefData?.title?.[0] || 'Untitled';
  const year = crossrefData?.issued?.['date-parts']?.[0]?.[0] || '';
  const doi = crossrefData?.DOI || '';
  
  // Generate a cite key e.g., "Smith2023"
  const firstAuthorFamily = crossrefData?.author?.[0]?.family?.replace(/[^a-zA-Z0-9]/g, '') || 'Reference';
  const citeKey = `${firstAuthorFamily}${year || 'nd'}`;

  const bibtex = `@${type}{${citeKey},
  author = {${authors}},
  title = {${title}},
  year = {${year}},
  doi = {${doi}}
}`;

  return { bibtex, citeKey };
}
