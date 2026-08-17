import { NextRequest, NextResponse } from 'next/server';
import { parseTexDocument } from '@/lib/parsers/tex-parser';
import { parseDocxBuffer } from '@/lib/parsers/docx-parser';
import { parseMathBlocks } from '@/lib/parsers/math-parser';

// Maximum upload limit (25 MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided in the upload request' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds institutional limit (25 MB)' },
        { status: 413 }
      );
    }

    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. LaTeX Manuscripts (.tex, .latex)
    if (extension === 'tex' || extension === 'latex') {
      const rawTex = buffer.toString('utf-8');
      const parsed = parseTexDocument(rawTex);

      return NextResponse.json({
        success: true,
        fileName,
        fileFormat: 'tex',
        title: parsed.title || fileName.replace(/\.[^/.]+$/, ''),
        abstract: parsed.abstract,
        rawText: rawTex,
        cleanedBody: parsed.cleanedBody,
        paragraphs: parsed.paragraphs,
        mathBlocks: Array.from(parsed.mathBlocks.entries()),
        existingCitations: parsed.existingCitations,
        citationKeys: Array.from(parsed.citationKeys),
      });
    }

    // 2. Microsoft Word Manuscripts (.docx)
    if (extension === 'docx') {
      const parsed = await parseDocxBuffer(buffer);

      return NextResponse.json({
        success: true,
        fileName,
        fileFormat: 'docx',
        title: fileName.replace(/\.[^/.]+$/, ''),
        rawText: parsed.rawText,
        cleanedBody: parsed.cleanedBody,
        paragraphs: parsed.paragraphs,
        mathBlocks: Array.from(parsed.mathBlocks.entries()),
        existingCitations: parsed.existingCitations,
        citationMarkers: Array.from(parsed.citationMarkers),
      });
    }

    // 3. Plain Text / Markdown Manuscripts (.txt, .md)
    if (extension === 'txt' || extension === 'md') {
      const rawText = buffer.toString('utf-8');
      const { text: cleanedBody, mathBlocks } = parseMathBlocks(rawText);

      const paragraphs = cleanedBody
        .split(/\n\s*\n|\r\n\r\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 30);

      return NextResponse.json({
        success: true,
        fileName,
        fileFormat: 'txt',
        title: fileName.replace(/\.[^/.]+$/, ''),
        rawText,
        cleanedBody,
        paragraphs,
        mathBlocks: Array.from(mathBlocks.entries()),
        existingCitations: [],
      });
    }

    return NextResponse.json(
      { error: `Unsupported file extension .${extension}. Please upload a .tex, .docx, or .txt file.` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Ingest API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to process and parse uploaded manuscript' },
      { status: 500 }
    );
  }
}