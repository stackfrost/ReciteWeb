import fs from 'fs';
import path from 'path';

const BENCHMARK_DIR = path.resolve(__dirname, '../.benchmark-payload');
const CHAPTERS_DIR = path.join(BENCHMARK_DIR, 'chapters');

function generateMathBlock(): string {
  return `\\begin{align*}\n  E &= mc^2 \\\\\n  \\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0}\n\\end{align*}\n`;
}

function generateProseBlock(chapterIndex: number, lineIndex: number): string {
  return `This is line ${lineIndex} of chapter ${chapterIndex}. We demonstrate the scalability of the parser by citing a complex finding \\cite{ref${chapterIndex}_${lineIndex}}.\n`;
}

function generateChapter(chapterIndex: number): string {
  let content = `\\chapter{Analysis of Sector ${chapterIndex}}\n\n`;

  for (let i = 0; i < 500; i++) {
    content += generateProseBlock(chapterIndex, i);
    
    // Inject 50 math blocks evenly distributed
    if (i > 0 && i % 10 === 0 && (i / 10) <= 50) {
      content += generateMathBlock();
    }
  }

  // Inject circular dependency in 5 specific chapters
  if ([2, 4, 8, 12, 16].includes(chapterIndex)) {
    content += `\n% Intentional Circular Dependency Injection for Fuzzing\n\\input{../main.tex}\n`;
  }

  return content;
}

function generateMainTex(): string {
  let content = `\\documentclass{report}\n\\begin{document}\n\n`;
  
  for (let i = 1; i <= 20; i++) {
    content += `\\include{chapters/chapter${i}.tex}\n`;
  }
  
  content += `\\end{document}\n`;
  return content;
}

async function main() {
  console.log('[Stress Generator] Generating synthetic benchmark payload...');
  
  if (fs.existsSync(BENCHMARK_DIR)) {
    fs.rmSync(BENCHMARK_DIR, { recursive: true, force: true });
  }
  
  fs.mkdirSync(CHAPTERS_DIR, { recursive: true });

  for (let i = 1; i <= 20; i++) {
    const chapContent = generateChapter(i);
    fs.writeFileSync(path.join(CHAPTERS_DIR, `chapter${i}.tex`), chapContent, 'utf-8');
  }

  fs.writeFileSync(path.join(BENCHMARK_DIR, 'main.tex'), generateMainTex(), 'utf-8');

  console.log(`[Stress Generator] Successfully generated 1 main.tex and 20 chapter files in ${BENCHMARK_DIR}`);
}

main().catch(console.error);
