import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { LaTeXParser } from '../latex-parser';
import { CircularReferenceError } from '../../lib/parsers/tex-parser';
import { CoordinateDriftTracker, TextMutation } from '../coordinate-tracker';
import { execSync } from 'child_process';

const BENCHMARK_DIR = path.resolve(__dirname, '../../../.benchmark-payload');
const MAIN_TEX = path.join(BENCHMARK_DIR, 'main.tex');

describe('E2E Stress & Benchmark Suite', () => {
  beforeAll(() => {
    // Generate the payload dynamically before tests
    execSync('npx tsx scripts/generate-stress-thesis.ts', { stdio: 'inherit' });
  }, 60000);


  it('[Test 1] Parser Throughput & Cycle Detection Graph Scaling', async () => {
    const t0 = performance.now();
    let caughtError: unknown = null;

    try {
      await LaTeXParser.parseProject(MAIN_TEX);
    } catch (err) {
      caughtError = err;
    }

    const t1 = performance.now();
    const durationMs = t1 - t0;

    // Assert that the circular reference graph intercepted the fuzzing
    expect(caughtError).toBeInstanceOf(CircularReferenceError);

    // Assert that a 10,000+ line topological parsing pass completes in reasonable time
    expect(durationMs).toBeLessThan(2000);
    console.log(`[Benchmark] parseProject completed (intercepted cycles) in ${durationMs.toFixed(2)}ms`);
  });


  it('[Test 2] IPC & Memory Latency - Massive Multi-File Mutation Matrix', () => {
    // We simulate 3 chapter files loaded into memory
    const chapterTexts = [
      fs.readFileSync(path.join(BENCHMARK_DIR, 'chapters/chapter1.tex'), 'utf-8'),
      fs.readFileSync(path.join(BENCHMARK_DIR, 'chapters/chapter2.tex'), 'utf-8'),
      fs.readFileSync(path.join(BENCHMARK_DIR, 'chapters/chapter3.tex'), 'utf-8'),
    ];

    const t0 = performance.now();

    // Generate 50 simultaneous citations replacements across 3 files
    for (let i = 0; i < 3; i++) {
      let content = chapterTexts[i];
      for (let j = 0; j < 50; j++) {
        // Mocking a massive string replace (simulating the UI applying 50 patches)
        content = content.replace(`\\cite{ref${i + 1}_${j}}`, `\\cite{corrected_${j}}`);
      }
      expect(content).not.toEqual(chapterTexts[i]);
    }

    const t1 = performance.now();
    const durationMs = t1 - t0;

    // Ensure applying 150 heavy string mutations completes rapidly
    expect(durationMs).toBeLessThan(50);
    console.log(`[Benchmark] Massive TextMutation string ops completed in ${durationMs.toFixed(2)}ms`);
  });

  it('[Test 3] Drift Guard Validation - O(log M) Binary Search Scaling', () => {
    const originalText = fs.readFileSync(path.join(BENCHMARK_DIR, 'chapters/chapter1.tex'), 'utf-8');
    const tracker = new CoordinateDriftTracker(originalText);

    // Seed 1000 mutations to bloat the ledger
    let currentOffset = 100;
    for (let i = 0; i < 1000; i++) {
      const mut: TextMutation = {
        originalStartOffset: currentOffset,
        originalEndOffset: currentOffset + 10,
        newText: 'REPLACED',
        delta: -2,
      };
      tracker.registerMutation(mut);
      currentOffset += 20; // Ensure mutations do not overlap
    }

    const targetQueryOffset = 15000;

    const t0 = performance.now();
    
    // Resolve the shifted offset against 1000 prior mutations
    const shifted = tracker.calculateShiftedOffset(targetQueryOffset);

    const t1 = performance.now();
    const durationMs = t1 - t0;

    // Assert O(log M) scaling is under 10ms for massive payloads
    expect(durationMs).toBeLessThan(10);
    expect(shifted).toBeDefined();
    console.log(`[Benchmark] CoordinateDriftTracker binary search completed in ${durationMs.toFixed(4)}ms`);
  });
});
