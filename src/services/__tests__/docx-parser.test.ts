import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseDocxDocument } from '../docx-parser';

describe('DOCX Ingestion & OMML Math Parser (src/services/docx-parser.ts)', () => {
  it('correctly unpacks docx and extracts text with quarantined OMML math and Zotero citations', async () => {
    const mockDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <w:body>
        <w:p>
          <w:r><w:t>We evaluate the Hamiltonian dynamics of </w:t></w:r>
          <m:oMath>
            <m:sSub>
              <m:e><m:r><m:t>H</m:t></m:r></m:e>
              <m:sub><m:r><m:t>eff</m:t></m:r></m:sub>
            </m:sSub>
          </m:oMath>
          <w:r><w:t> in triangular lattices.</w:t></w:r>
        </w:p>
        <w:p>
          <w:instrText>ADDIN ZOTERO_ITEM {"citationItems":[{"citationKey":"anderson1987"}]}</w:instrText>
        </w:p>
      </w:body>
    </w:document>`;

    const zip = new JSZip();
    zip.file('word/document.xml', mockDocumentXml);
    const docxBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    const parsed = await parseDocxDocument(docxBuffer);

    expect(parsed.format).toBe('docx');
    expect(parsed.citations.length).toBe(1);
    expect(parsed.citations[0].keys).toContain('anderson1987');
    expect(parsed.mathBlocks.length).toBe(1);
    expect(parsed.mathBlocks[0].content).toContain('H_{eff}');
    expect(parsed.sanitizedContent).toContain('__RECITEAI_DOCX_MATH_0_');
    expect(parsed.mathTokenMap.get(parsed.mathBlocks[0].quarantineToken)).toBe('$H_{eff}$');
  });

  it('converts complex OMML structures (fractions, superscripts, and radicals) into LaTeX notation', async () => {
    const mockDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <w:body>
        <w:p>
          <m:oMathPara>
            <m:oMath>
              <m:f>
                <m:num><m:r><m:t>a</m:t></m:r></m:num>
                <m:den><m:r><m:t>b</m:t></m:r></m:den>
              </m:f>
              <m:r><m:t> + </m:t></m:r>
              <m:sSup>
                <m:e><m:r><m:t>x</m:t></m:r></m:e>
                <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
              </m:sSup>
              <m:r><m:t> = </m:t></m:r>
              <m:rad>
                <m:deg><m:r><m:t>3</m:t></m:r></m:deg>
                <m:e><m:r><m:t>y</m:t></m:r></m:e>
              </m:rad>
            </m:oMath>
          </m:oMathPara>
        </w:p>
      </w:body>
    </w:document>`;

    const zip = new JSZip();
    zip.file('word/document.xml', mockDocumentXml);
    const docxBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    const parsed = await parseDocxDocument(docxBuffer);

    expect(parsed.mathBlocks.length).toBe(1);
    expect(parsed.mathBlocks[0].displayMode).toBe(true);
    expect(parsed.mathBlocks[0].content).toContain('\\frac{a}{b}');
    expect(parsed.mathBlocks[0].content).toContain('x^{2}');
    expect(parsed.mathBlocks[0].content).toContain('\\sqrt[3]{y}');
  });

  it('scans fallback bracketed citations when no dedicated field codes are present', async () => {
    const mockDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p>
          <w:r><w:t>As demonstrated by earlier works [Einstein1905; Heisenberg1927], quantum uncertainty holds.</w:t></w:r>
        </w:p>
      </w:body>
    </w:document>`;

    const zip = new JSZip();
    zip.file('word/document.xml', mockDocumentXml);
    const docxBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    const parsed = await parseDocxDocument(docxBuffer);

    expect(parsed.citations.length).toBe(1);
    expect(parsed.citations[0].keys).toEqual(['Einstein1905', 'Heisenberg1927']);
  });

  it('throws an informative error if word/document.xml is missing from the zip archive', async () => {
    const zip = new JSZip();
    zip.file('other-file.txt', 'hello');
    const invalidBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    await expect(parseDocxDocument(invalidBuffer)).rejects.toThrow('word/document.xml not found');
  });
});
